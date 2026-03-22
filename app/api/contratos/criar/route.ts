import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { criarEventoMeet } from '@/lib/google-calendar'
import { enviarEmailBoasVindas } from '@/lib/resend'
import { gerarGradeAulas, formatDateTime } from '@/lib/utils'
import { fromZonedTime } from 'date-fns-tz'
import { calculateContractSpecs } from '@/lib/utils/contract-logic'

export async function POST(request: NextRequest) {
  // ... (authorization and data extraction)
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
    diasDaSemana,
    horario,
    valor,
    livroAtual,
    nivelAtual,
    diaVencimento,
    formaPagamento,
    tipoContrato,
    descontoValor,
    descontoPercentual,
    aulasTotais,
    numParcelas,
  } = await request.json()

  console.log('--- CONTRACT CREATION DEBUG ---')
  console.log('Payload:', { alunoId, planoId, dataInicio, dataFim, diasDaSemana, valor, aulasTotais, numParcelas })

  const serviceSupabase = await createServiceClient()

  // Get plano & aluno
  const { data: plano } = await serviceSupabase.from('planos').select('*').eq('id', planoId).single()
  const { data: aluno } = await serviceSupabase.from('profiles').select('*').eq('id', alunoId).single()

  if (!plano || !aluno) return NextResponse.json({ error: 'Plano ou Aluno não encontrado' }, { status: 404 })

  // Calculate Specs for tagging and installments
  const startObj = new Date(dataInicio + 'T12:00:00')
  const endObj = dataFim ? new Date(dataFim + 'T12:00:00') : undefined
  const specs = calculateContractSpecs(startObj, planoId, diasDaSemana, tipoContrato, endObj)

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
      aulas_totais: aulasTotais || specs.totalLessons,
      aulas_restantes: aulasTotais || specs.totalLessons,
      livro_atual: livroAtual,
      nivel_atual: nivelAtual,
      horario: horario,
      valor: valor,
      dia_vencimento: diaVencimento,
      forma_pagamento: formaPagamento,
      tipo_contrato: tipoContrato || 'semestral',
      desconto_valor: descontoValor || 0,
      desconto_percentual: descontoPercentual || 0,
      dias_da_semana: diasDaSemana,
    })
    .select()
    .single()

  if (contratoErr || !contrato) {
    console.error('Contrato insert error:', contratoErr)
    return NextResponse.json({ error: 'Erro ao criar contrato no banco de dados', details: contratoErr }, { status: 500 })
  }

  // Generate lesson schedule (skips holidays and recess now)
  const { data: recessosDb } = await serviceSupabase.from('recessos').select('data_inicio, data_fim')
  const customHolidays: string[] = []
  
  if (recessosDb) {
    recessosDb.forEach((r: { data_inicio: string; data_fim: string }) => {
      const start = new Date(r.data_inicio + 'T12:00:00')
      const end = new Date(r.data_fim + 'T12:00:00')
      let curr = new Date(start)
      while (curr <= end) {
        customHolidays.push(curr.toISOString().split('T')[0])
        curr.setDate(curr.getDate() + 1)
      }
    })
  }

  const inicio = new Date(dataInicio + 'T12:00:00')
  const fim = new Date(dataFim + 'T23:59:59')
  const datasAulas = gerarGradeAulas(inicio, fim, diasDaSemana, parseInt(aulasTotais), customHolidays)

  // Create Google Calendar events + aulas records
  const aulasParaInserir: any[] = []
  const primeirasCinco: { data: string; link: string }[] = []

  for (let i = 0; i < datasAulas.length; i++) {
    const dateOnly = datasAulas[i]
    const dateStr = dateOnly.toISOString().split('T')[0]
    
    // Normalize horario (HH:mm)
    const cleanHorario = horario.replace('h', ':').trim()
    const dataObj = fromZonedTime(`${dateStr} ${cleanHorario}`, 'America/Sao_Paulo')
    
    // Safety check for invalid date
    if (isNaN(dataObj.getTime())) {
      console.warn(`Skipping invalid date for lesson ${i}: ${dateStr} ${horario}`)
      continue
    }

    const isBonus = i >= specs.regularLessons 

    let eventId = ''
    let meetLink = ''

    try {
      const result = await criarEventoMeet({
        titulo: `${isBonus ? '🎁 ' : '🇺🇸 '}Aula de Inglês — ${aluno.full_name}`,
        dataHora: dataObj,
        emailAluno: aluno.email,
        emailProfessor: process.env.RESEND_FROM_EMAIL!,
        descricao: `
📌 DETALHES DA AULA ${isBonus ? '(BÔNUS)' : ''}
👤 Aluno: ${aluno.full_name}
📚 Nível: ${nivelAtual || 'N/A'}
📖 Livro: ${livroAtual || 'N/A'}

🔗 [Ver no Sistema](${process.env.NEXT_PUBLIC_APP_URL}/professor/alunos/${alunoId})
---
Instruções:
- Clique no link do Google Meet abaixo para entrar na aula.
- Caso precise remarcar, com 2h de antecedência.
        `.trim()
      })
      eventId = result.eventId
      meetLink = result.meetLink
    } catch (e) {
      console.error('Google Calendar error', e)
    }

    aulasParaInserir.push({
      contrato_id: contrato.id,
      google_event_id: eventId || null,
      data_hora: dataObj.toISOString(),
      duracao_minutos: 45,
      status: 'agendada',
      meet_link: meetLink,
      is_bonus: isBonus
    })

    if (primeirasCinco.length < 5) {
      primeirasCinco.push({ data: formatDateTime(dataObj), link: meetLink })
    }
  }

  const { error: insertAulasErr } = await serviceSupabase.from('aulas').insert(aulasParaInserir)
  if (insertAulasErr) {
    console.error('Aulas insert error:', insertAulasErr)
    // Optional: Delete the contract if lessons fail? Or at least return error.
    return NextResponse.json({ 
      error: 'Contrato criado, mas erro ao gerar grade de aulas.', 
      details: insertAulasErr,
      contratoId: contrato.id 
    }, { status: 500 })
  }

  // Create installments based on request or calculation
  const nParcelas = numParcelas || (tipoContrato === 'ad-hoc' ? 1 : specs.remainingMonths)
  const valorParcela = parseFloat((valor / nParcelas).toFixed(2))
  const pagamentosParaInserir = []
  
  for (let i = 1; i <= nParcelas; i++) {
    const mesVenc = new Date(dataInicio + 'T12:00:00')
    mesVenc.setMonth(mesVenc.getMonth() + i - 1)
    
    const ultimoDiaMes = new Date(mesVenc.getFullYear(), mesVenc.getMonth() + 1, 0).getDate()
    const diaEfetivo = Math.min(diaVencimento || 5, ultimoDiaMes)
    // Set to 12h to avoid UTC date shifts
    const vencimento = new Date(mesVenc.getFullYear(), mesVenc.getMonth(), diaEfetivo, 12, 0, 0)

    pagamentosParaInserir.push({
      contrato_id: contrato.id,
      parcela_num: i,
      valor: valorParcela,
      data_vencimento: vencimento.toISOString().split('T')[0],
      status: 'pendente',
      forma: formaPagamento || 'pix',
    })
  }

  const { error: insertPagamentosErr } = await serviceSupabase.from('pagamentos').insert(pagamentosParaInserir)
  if (insertPagamentosErr) {
    console.error('Pagamentos insert error:', insertPagamentosErr)
    return NextResponse.json({ 
      error: 'Contrato e aulas criados, mas erro ao gerar parcelas de pagamento.', 
      details: insertPagamentosErr,
      contratoId: contrato.id 
    }, { status: 500 })
  }


  // Generate password recovery/setup link
  const { data: linkData } = await serviceSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: aluno.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
    }
  })

  // Welcome email
  await enviarEmailBoasVindas({
    to: aluno.email,
    nomeAluno: aluno.full_name,
    plano: plano.descricao || '',
    dataInicio: new Date(dataInicio).toLocaleDateString('pt-BR'),
    dataFim: new Date(dataFim).toLocaleDateString('pt-BR'),
    aulas: primeirasCinco,
    setupPasswordLink: linkData?.properties?.action_link,
  })

  return NextResponse.json({ success: true, contrato })
}
