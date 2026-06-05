import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { LessonReportPdf, type LessonReportPdfData } from '@/lib/pdf/lesson-report-pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function formatLessonDate(value: string | null) {
  if (!value) return 'Data não informada'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(value))
  } catch {
    return 'Data não informada'
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ aulaId: string }> }) {
  const { aulaId } = await params
  const id = Number(aulaId)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isProfessor = profile?.role === 'professor'

  const { data: aula } = await supabase
    .from('aulas')
    .select('id, data_hora, ai_summary_pt, vocabulary_json, contratos(aluno_id, profiles:aluno_id(full_name))')
    .eq('id', id)
    .single()

  if (!aula) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 })

  const contrato = (aula.contratos ?? null) as { aluno_id?: string; profiles?: { full_name?: string | null } | null } | null

  // Ownership: a student may only export their own lesson report.
  if (!isProfessor && contrato?.aluno_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data: LessonReportPdfData = {
    studentName: contrato?.profiles?.full_name || 'Aluno(a)',
    lessonDate: formatLessonDate(aula.data_hora as string | null),
    summaryPt: aula.ai_summary_pt as string | null,
    vocabulary: Array.isArray(aula.vocabulary_json)
      ? (aula.vocabulary_json as Array<{ word: string; translation: string; example?: string }>)
      : [],
  }

  const buffer = await renderToBuffer(<LessonReportPdf data={data} />)
  const fileName = `relatorio-aula-${id}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
