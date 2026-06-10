'use server'

import { requireProfessor } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getCachedOrGenerateAudio } from '@/lib/placement-audio-cache'
import { validateQuestoes, type Questao } from '@/lib/atividades-utils'
import { LEECH_THRESHOLD } from '@/lib/flashcards-srs'

// TTS para a pronúncia ao vivo — reaproveita o cache content-addressed (mesmo
// bucket público), então frases repetidas não gastam quota. Professor-only.
export async function getPainelAudio(text: string): Promise<string | null> {
  await requireProfessor()
  const trimmed = (text || '').trim().slice(0, 600)
  if (!trimmed) return null
  return getCachedOrGenerateAudio(trimmed)
}

// Vocabulário de um aluno para o "vocab blitz": prioriza as leech words (as que
// ele mais erra) e completa com as mais recentes. Professor-only.
export async function getVocabDoAluno(
  studentId: string
): Promise<Array<{ palavra: string; traducao: string }>> {
  await requireProfessor()
  const supabase = await createServiceClient()

  const { data: leech } = await supabase
    .from('flashcards')
    .select('word, translation, lapses')
    .eq('aluno_id', studentId)
    .gte('lapses', LEECH_THRESHOLD)
    .order('lapses', { ascending: false })
    .limit(20)

  const { data: recent } = await supabase
    .from('flashcards')
    .select('word, translation')
    .eq('aluno_id', studentId)
    .order('created_at', { ascending: false })
    .limit(30)

  const seen = new Set<string>()
  const out: Array<{ palavra: string; traducao: string }> = []
  for (const row of [...(leech || []), ...(recent || [])]) {
    const palavra = (row.word || '').trim()
    const traducao = (row.translation || '').trim()
    if (!palavra || seen.has(palavra.toLowerCase())) continue
    seen.add(palavra.toLowerCase())
    out.push({ palavra, traducao })
  }
  return out.slice(0, 30)
}

// Questões de múltipla escolha do repositório, para o quiz-relâmpago. Inclui a
// resposta correta porque o cliente do PROFESSOR a guarda e só a revela quando
// quiser (nunca é enviada ao aluno automaticamente). Professor-only.
export async function getQuizQuestions(): Promise<
  Array<{ enunciado: string; opcoes: string[]; corretaIndice: number; atividade: string }>
> {
  await requireProfessor()
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('atividades')
    .select('titulo, questoes')
    .order('created_at', { ascending: false })
    .limit(40)

  const out: Array<{ enunciado: string; opcoes: string[]; corretaIndice: number; atividade: string }> = []
  for (const row of data || []) {
    const questoes = validateQuestoes((row as { questoes: Questao[] }).questoes)
    for (const q of questoes) {
      if (q.tipo === 'multipla_escolha' && q.opcoes && typeof q.respostaIndice === 'number') {
        out.push({
          enunciado: q.enunciado,
          opcoes: q.opcoes,
          corretaIndice: q.respostaIndice,
          atividade: (row as { titulo: string }).titulo,
        })
      }
    }
  }
  return out.slice(0, 60)
}
