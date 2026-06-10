'use server'

import { revalidatePath } from 'next/cache'
import { generateAIContent, generateAIContentFromFile, extractAndParseJSON } from '@/lib/ai'
import {
  ATIVIDADE_NIVEIS,
  QUESTAO_TIPOS,
  gradeRespostas,
  sanitizeQuestoesForStudent,
  validateQuestoes,
  type AtividadeNivel,
  type Questao,
  type QuestaoTipo,
  type RespostaAluno,
} from '@/lib/atividades-utils'
import { requireAuth, requireProfessor } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { logActivityBestEffort } from '@/lib/activity-log'
import { registerStudentActivityBestEffort } from '@/lib/streak'

const TIPO_PROMPT: Record<QuestaoTipo, string> = {
  multipla_escolha:
    '{"tipo":"multipla_escolha","enunciado":"...","opcoes":["A","B","C","D"],"respostaIndice":0}',
  verdadeiro_falso: '{"tipo":"verdadeiro_falso","enunciado":"...","respostaBool":true}',
  lacunas:
    '{"tipo":"lacunas","enunciado":"frase com ___ no lugar da palavra","respostaTexto":"resposta|alternativa aceita"}',
  ordenar:
    '{"tipo":"ordenar","enunciado":"Coloque na ordem correta","itens":["primeiro","segundo","terceiro","quarto"]} (itens JÁ na ordem correta)',
  dissertativa:
    '{"tipo":"dissertativa","enunciado":"pergunta aberta","criterio":"o que uma boa resposta deve conter"}',
}

// Gera um rascunho de atividade via Gemini. NÃO salva — o professor revisa e
// edita antes de salvar no repositório.
export async function gerarAtividadeIA(input: {
  tema: string
  nivel: AtividadeNivel
  tipos: QuestaoTipo[]
  quantidade: number
}) {
  await requireProfessor()

  const tema = (input.tema || '').trim().slice(0, 300)
  if (!tema) throw new Error('Descreva o tema da atividade.')
  const nivel = ATIVIDADE_NIVEIS.includes(input.nivel) ? input.nivel : 'B1'
  const tipos = (input.tipos || []).filter((t) => QUESTAO_TIPOS.includes(t))
  if (tipos.length === 0) throw new Error('Selecione pelo menos um tipo de questão.')
  const quantidade = Math.max(3, Math.min(15, Number(input.quantidade) || 8))

  const formatos = tipos.map((t) => `- ${TIPO_PROMPT[t]}`).join('\n')

  const prompt = `
    Você é um especialista em design de exercícios de inglês (padrão Cambridge/CEFR).
    Crie ${quantidade} questões INÉDITAS de nível CEFR ${nivel} sobre o tema: "${tema}".
    Misture APENAS estes formatos (use todos ao longo da lista):
${formatos}

    REGRAS CRÍTICAS:
    1. Enunciados e conteúdo em INGLÊS (instruções curtas podem ser em inglês simples).
    2. Para "lacunas", o enunciado DEVE conter ___ exatamente onde falta a palavra.
    3. Para "ordenar", os itens devem vir na ORDEM CORRETA (o app embaralha).
    4. Retorne APENAS JSON válido neste formato exato:
    {"titulo": "Título curto da atividade em inglês", "questoes": [ ...objetos nos formatos acima... ]}
    5. Sem preâmbulos, sem markdown, sem explicações.
  `

  const response = await generateAIContent(prompt, undefined, 'application/json')
  if (!response) throw new Error('A IA não retornou conteúdo. Tente novamente.')

  const parsed = extractAndParseJSON(response) as { titulo?: unknown; questoes?: unknown }
  const questoes = validateQuestoes(parsed?.questoes)
  if (questoes.length < Math.min(3, quantidade)) {
    throw new Error('A IA gerou questões inválidas demais. Tente gerar novamente.')
  }

  return {
    titulo: typeof parsed?.titulo === 'string' && parsed.titulo.trim() ? parsed.titulo.trim() : tema,
    nivel,
    questoes,
  }
}

const PDF_MAX_BYTES = 6 * 1024 * 1024

// Extrai questões de um PDF (apostila/worksheet) via Gemini multimodal e
// devolve um rascunho no mesmo formato do gerador — o professor revisa antes
// de salvar (tipo_fonte 'pdf').
export async function importarAtividadePDF(formData: FormData) {
  await requireProfessor()

  const file = formData.get('file')
  if (!(file instanceof File)) throw new Error('Envie um arquivo PDF.')
  if (file.type !== 'application/pdf') throw new Error('Apenas arquivos PDF são aceitos.')
  if (file.size > PDF_MAX_BYTES) throw new Error('O PDF excede o limite de 6 MB.')

  const nivelRaw = String(formData.get('nivel') || 'B1') as AtividadeNivel
  const nivel = ATIVIDADE_NIVEIS.includes(nivelRaw) ? nivelRaw : 'B1'

  const dataBase64 = Buffer.from(await file.arrayBuffer()).toString('base64')

  const formatos = QUESTAO_TIPOS.map((t) => `- ${TIPO_PROMPT[t]}`).join('\n')
  const prompt = `
    O PDF anexado contém exercícios de inglês. EXTRAIA as questões do documento,
    convertendo cada uma para o formato estruturado abaixo. Use o tipo que melhor
    representa cada questão original:
${formatos}

    REGRAS CRÍTICAS:
    1. NÃO invente questões — extraia apenas o que existe no PDF (enunciados podem ser levemente normalizados).
    2. Para questões cujo gabarito não está no PDF, RESOLVA a questão você mesmo para preencher a resposta.
    3. Para "lacunas", garanta que o enunciado contenha ___ no lugar da palavra.
    4. Para "ordenar", liste os itens na ORDEM CORRETA.
    5. Questões abertas/redação viram "dissertativa".
    6. Retorne APENAS JSON válido: {"titulo": "título derivado do PDF", "questoes": [...]}
  `

  const response = await generateAIContentFromFile(prompt, {
    mimeType: 'application/pdf',
    dataBase64,
  })
  if (!response) throw new Error('A IA não conseguiu ler o PDF. Tente novamente.')

  const parsed = extractAndParseJSON(response) as { titulo?: unknown; questoes?: unknown }
  const questoes = validateQuestoes(parsed?.questoes)
  if (questoes.length === 0) {
    throw new Error('Nenhuma questão válida foi extraída deste PDF. Confira se ele contém exercícios.')
  }

  return {
    titulo:
      typeof parsed?.titulo === 'string' && parsed.titulo.trim()
        ? parsed.titulo.trim()
        : file.name.replace(/\.pdf$/i, ''),
    nivel,
    questoes,
  }
}

export async function salvarAtividade(input: {
  id?: string | null
  titulo: string
  descricao?: string | null
  nivel: AtividadeNivel
  tipoFonte?: 'ia' | 'manual' | 'pdf'
  questoes: Questao[]
}) {
  const { user } = await requireProfessor()
  const supabase = await createServiceClient()

  const titulo = (input.titulo || '').trim().slice(0, 200)
  if (!titulo) throw new Error('A atividade precisa de um título.')
  const questoes = validateQuestoes(input.questoes)
  if (questoes.length === 0) throw new Error('A atividade precisa de pelo menos uma questão válida.')
  const nivel = ATIVIDADE_NIVEIS.includes(input.nivel) ? input.nivel : 'B1'

  const payload = {
    titulo,
    descricao: (input.descricao || '').trim() || null,
    nivel,
    tipo_fonte: input.tipoFonte || 'ia',
    questoes,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { error } = await supabase.from('atividades').update(payload).eq('id', input.id)
    if (error) throw new Error('Falha ao atualizar a atividade.')
    revalidatePath('/professor/atividades')
    return { success: true, id: input.id }
  }

  const { data, error } = await supabase
    .from('atividades')
    .insert({ ...payload, created_by: user.id })
    .select('id')
    .single()
  if (error || !data) throw new Error('Falha ao salvar a atividade.')

  revalidatePath('/professor/atividades')
  return { success: true, id: data.id as string }
}

export async function excluirAtividade(atividadeId: string) {
  await requireProfessor()
  const supabase = await createServiceClient()
  const { error } = await supabase.from('atividades').delete().eq('id', atividadeId)
  if (error) throw new Error('Falha ao excluir a atividade.')
  revalidatePath('/professor/atividades')
  return { success: true }
}

export async function atribuirAtividade(input: {
  atividadeId: string
  alunoIds: string[]
  dueDate?: string | null
}) {
  await requireProfessor()
  const supabase = await createServiceClient()

  const alunoIds = Array.from(new Set((input.alunoIds || []).filter(Boolean)))
  if (alunoIds.length === 0) throw new Error('Selecione pelo menos um aluno.')

  const { data: atividade } = await supabase
    .from('atividades')
    .select('id, titulo')
    .eq('id', input.atividadeId)
    .single()
  if (!atividade) throw new Error('Atividade não encontrada.')

  // Evita duplicar atribuição pendente do mesmo exercício para o mesmo aluno.
  const { data: existentes } = await supabase
    .from('atividade_atribuicoes')
    .select('aluno_id')
    .eq('atividade_id', input.atividadeId)
    .eq('status', 'pendente')
    .in('aluno_id', alunoIds)
  const jaTem = new Set((existentes || []).map((e) => e.aluno_id as string))
  const novos = alunoIds.filter((id) => !jaTem.has(id))

  if (novos.length > 0) {
    const dueDate = input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ? input.dueDate : null
    const { error } = await supabase.from('atividade_atribuicoes').insert(
      novos.map((alunoId) => ({
        atividade_id: input.atividadeId,
        aluno_id: alunoId,
        due_date: dueDate,
      }))
    )
    if (error) throw new Error('Falha ao atribuir a atividade.')

    for (const alunoId of novos) {
      await logActivityBestEffort({
        targetUserId: alunoId,
        eventType: 'activity.assigned',
        title: 'Atividade atribuída',
        description: `A atividade "${atividade.titulo}" foi atribuída ao aluno.`,
        severity: 'info',
      })
    }
  }

  revalidatePath('/professor/atividades')
  revalidatePath('/aluno/atividades')
  return { success: true, atribuidas: novos.length, puladas: alunoIds.length - novos.length }
}

// Visão do aluno: questões SANITIZADAS (sem gabarito), embaralhamento
// determinístico por atribuição.
export async function getAtividadeParaResponder(atribuicaoId: string) {
  const user = await requireAuth()
  const supabase = await createServiceClient()

  const { data: atribuicao } = await supabase
    .from('atividade_atribuicoes')
    .select('id, aluno_id, status, due_date, respostas, acertos, total_objetivas, nota, feedback, atividades(id, titulo, descricao, nivel, questoes)')
    .eq('id', atribuicaoId)
    .single()

  if (!atribuicao || atribuicao.aluno_id !== user.id) {
    throw new Error('Atividade não encontrada.')
  }

  const atividade = atribuicao.atividades as unknown as {
    id: string
    titulo: string
    descricao: string | null
    nivel: string | null
    questoes: Questao[]
  } | null
  if (!atividade) throw new Error('Atividade não encontrada.')

  const questoes = sanitizeQuestoesForStudent(validateQuestoes(atividade.questoes), atribuicao.id)

  return {
    id: atribuicao.id,
    titulo: atividade.titulo,
    descricao: atividade.descricao,
    nivel: atividade.nivel,
    status: atribuicao.status as 'pendente' | 'entregue' | 'corrigida',
    dueDate: atribuicao.due_date as string | null,
    questoes,
    resultado:
      atribuicao.status === 'pendente'
        ? null
        : {
            acertos: atribuicao.acertos as number | null,
            totalObjetivas: atribuicao.total_objetivas as number | null,
            nota: atribuicao.nota === null ? null : Number(atribuicao.nota),
            feedback: atribuicao.feedback as string | null,
          },
  }
}

// Correção 100% server-side (o gabarito nunca sai do servidor).
export async function submitAtividade(atribuicaoId: string, respostas: RespostaAluno[]) {
  const user = await requireAuth()
  const supabase = await createServiceClient()

  const { data: atribuicao } = await supabase
    .from('atividade_atribuicoes')
    .select('id, aluno_id, status, atividades(id, titulo, questoes)')
    .eq('id', atribuicaoId)
    .single()

  if (!atribuicao || atribuicao.aluno_id !== user.id) throw new Error('Atividade não encontrada.')
  if (atribuicao.status !== 'pendente') throw new Error('Esta atividade já foi entregue.')

  const atividade = atribuicao.atividades as unknown as { titulo: string; questoes: Questao[] } | null
  if (!atividade) throw new Error('Atividade não encontrada.')

  const questoes = validateQuestoes(atividade.questoes)
  const graded = gradeRespostas(questoes, respostas, atribuicao.id)

  const nota = graded.totalObjetivas > 0 ? (graded.acertos / graded.totalObjetivas) * 10 : null
  const novoStatus = graded.temDissertativa ? 'entregue' : 'corrigida'

  const { error } = await supabase
    .from('atividade_atribuicoes')
    .update({
      status: novoStatus,
      respostas: respostas,
      acertos: graded.acertos,
      total_objetivas: graded.totalObjetivas,
      nota: nota === null ? null : Math.round(nota * 100) / 100,
      submitted_at: new Date().toISOString(),
      graded_at: novoStatus === 'corrigida' ? new Date().toISOString() : null,
    })
    .eq('id', atribuicaoId)
  if (error) throw new Error('Falha ao enviar suas respostas. Tente novamente.')

  await registerStudentActivityBestEffort(user.id)
  await logActivityBestEffort({
    actorUserId: user.id,
    targetUserId: user.id,
    eventType: 'activity.submitted',
    title: 'Atividade entregue',
    description: `"${atividade.titulo}": ${graded.acertos}/${graded.totalObjetivas} nas questões objetivas.`,
    severity: 'success',
  })

  revalidatePath('/aluno/atividades')
  revalidatePath('/professor/atividades')

  return {
    success: true,
    status: novoStatus,
    acertos: graded.acertos,
    totalObjetivas: graded.totalObjetivas,
    nota,
    detalhes: graded.detalhes.map((d) => ({ id: d.id, correta: d.correta })),
  }
}

// Professor fecha a correção de uma entrega com dissertativa (feedback + nota final).
export async function corrigirAtividade(input: {
  atribuicaoId: string
  feedback?: string | null
  notaFinal?: number | null
}) {
  await requireProfessor()
  const supabase = await createServiceClient()

  const nota =
    input.notaFinal === null || input.notaFinal === undefined
      ? undefined
      : Math.max(0, Math.min(10, Number(input.notaFinal)))

  const { error } = await supabase
    .from('atividade_atribuicoes')
    .update({
      status: 'corrigida',
      feedback: (input.feedback || '').trim() || null,
      ...(nota === undefined ? {} : { nota }),
      graded_at: new Date().toISOString(),
    })
    .eq('id', input.atribuicaoId)
    .eq('status', 'entregue')
  if (error) throw new Error('Falha ao registrar a correção.')

  revalidatePath('/professor/atividades')
  revalidatePath('/aluno/atividades')
  return { success: true }
}
