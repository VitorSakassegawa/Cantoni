import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { criarEventoMeet } from '@/lib/google-calendar'
import { enviarEmailBoasVindas } from '@/lib/resend'
import { gerarGradeAulas, formatDateTime } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: professor } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (professor?.role !== 'professor') {
    return NextResponse.json({ error: 'Apenas o professor pode criar contratos' }, { status: 403 })
  }

  const {
    alunoId,
    planoId,
    dataInicio,
    dataFim,
    semestre,
    ano,
    diasDaSemana, // array de ints [0-6]
    horario, // "HH:MM"
    valor,
    livroAtual,
    nivelAtual,
  } = await request.json()

  const serviceSupabase = await createServiceClient()

  // Get plano
  const { data: plano } = await serviceSupabase
    .from('planos')
    .select('*')
    .eq('id', planoId)
    .single()

  if (!plano) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })

  // Get aluno
  const { data: aluno } = await serviceSupabase
    .from('profiles')
    .select('*')
    .eq('id', alunoId)
    .single()

  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  // Create contract
  const { data: contrato, error: contratoErr } = await serviceSupabase
    .from('contratos')
    .insert({
      aluno_id: alunoId,
      plano_id: planoId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      semestre,
      ano,
      aulas_totais: plano.aulas_totais,
      aulas_restantes: plano.aulas_totais,
      livro_atual: livroAtual,
      nivel_atual: nivelAtual,
    })
    .select()
    .single()

  if (contratoErr || !contrato) {
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }

  // Generate lesson schedule
  const [hh, mm] = horario.split(':').map(Number)
  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)

  const datasAulas = gerarGradeAulas(inicio, fim, diasDaSemana, plano.aulas_totais)

  // Create Google Calendar events + aulas records
  const aulasParaInserir: any[] = []
  const primeirasCinco: { data: string; link: string }[] = []

  for (const data of datasAulas) {
    data.setHours(hh, mm, 0, 0)
    let eventId = ''
    let meetLink = ''

    try {
      const result = await criarEventoMeet({
        titulo: `Aula de Inglês — ${aluno.full_name}`,
        dataHora: data,
        emailAluno: aluno.email,
        emailProfessor: process.env.RESEND_FROM_EMAIL!,
      })
      eventId = result.eventId
      meetLink = result.meetLink
    } catch (e) {
      console.error('Google Calendar error for', data, e)
    }

    aulasParaInserir.push({
      contrato_id: contrato.id,
      google_event_id: eventId || null,
      data_hora: data.toISOString(),
      duracao_minutos: 45,
      status: 'agendada',
      meet_link: meetLink,
    })

    if (primeirasCinco.length < 5) {
      primeirasCinco.push({ data: formatDateTime(data), link: meetLink })
    }
  }

  await serviceSupabase.from('aulas').insert(aulasParaInserir)

  // Create installments (pagamentos)
  const valorParcela = parseFloat((valor / 6).toFixed(2))
  const pagamentosParaInserir = []
  for (let i = 1; i <= 6; i++) {
    const mesVenc = new Date(dataInicio)
    mesVenc.setMonth(mesVenc.getMonth() + i - 1)
    const vencimento = new Date(mesVenc.getFullYear(), mesVenc.getMonth(), 5)

    pagamentosParaInserir.push({
      contrato_id: contrato.id,
      parcela_num: i,
      valor: valorParcela,
      data_vencimento: vencimento.toISOString().split('T')[0],
      status: 'pendente',
    })
  }

  await serviceSupabase.from('pagamentos').insert(pagamentosParaInserir)

  // Welcome email
  await enviarEmailBoasVindas({
    to: aluno.email,
    nomeAluno: aluno.full_name,
    plano: plano.descricao || '',
    dataInicio: new Date(dataInicio).toLocaleDateString('pt-BR'),
    dataFim: new Date(dataFim).toLocaleDateString('pt-BR'),
    aulas: primeirasCinco,
  })

  return NextResponse.json({ success: true, contrato })
}
