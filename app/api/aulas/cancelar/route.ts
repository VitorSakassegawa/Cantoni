import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { deletarEventoCalendar } from '@/lib/google-calendar'
import { enviarAulaContabilizadaComoDada } from '@/lib/resend'
import { horasAteAula, formatDateTime } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { aulaId } = await request.json()
  const serviceSupabase = await createServiceClient()

  const { data: aula } = await serviceSupabase
    .from('aulas')
    .select('*, contratos(aluno_id, aulas_dadas, aulas_restantes, profiles(full_name, email))')
    .eq('id', aulaId)
    .single()

  if (!aula) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })

  const contrato = aula.contratos as any
  const horas = horasAteAula(aula.data_hora)
  const avisoSuficiente = horas >= 2

  let novoStatus: string
  let aulasDadas = contrato.aulas_dadas
  let aulasRestantes = contrato.aulas_restantes

  if (avisoSuficiente) {
    novoStatus = 'cancelada'
    if (aula.google_event_id) {
      try { await deletarEventoCalendar(aula.google_event_id) } catch {}
    }
  } else {
    // Sem aviso suficiente → aula dada
    novoStatus = 'dada'
    aulasDadas++
    aulasRestantes--

    await enviarAulaContabilizadaComoDada({
      to: contrato.profiles.email,
      nomeAluno: contrato.profiles.full_name,
      dataHora: formatDateTime(aula.data_hora),
      aulasDadas,
      aulasRestantes,
    })
  }

  await serviceSupabase
    .from('aulas')
    .update({
      status: novoStatus,
      aviso_horas_antecedencia: Math.max(0, horas),
    })
    .eq('id', aulaId)

  return NextResponse.json({
    success: true,
    status: novoStatus,
    aulasDadas,
    aulasRestantes,
  })
}
