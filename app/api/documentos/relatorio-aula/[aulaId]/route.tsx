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

const MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "CES - Class 02.Jun.2026 (Vitor Sakassegawa)"
function buildReportFileName(studentName: string, dataHora: string | null) {
  let datePart = 'Lesson'
  if (dataHora) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).formatToParts(new Date(dataHora))
      const dd = parts.find((p) => p.type === 'day')?.value ?? ''
      const mm = Number(parts.find((p) => p.type === 'month')?.value ?? 0)
      const yyyy = parts.find((p) => p.type === 'year')?.value ?? ''
      if (dd && mm && yyyy) datePart = `${dd}.${MONTHS_ABBR[mm - 1]}.${yyyy}`
    } catch {
      /* keep fallback */
    }
  }
  return `CES - Class ${datePart} (${studentName})`
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
  const baseName = `${buildReportFileName(data.studentName, aula.data_hora as string | null)}.pdf`
  // ASCII-safe fallback + RFC 5987 UTF-8 name so accented student names survive.
  const asciiName = baseName.replace(/[^\x20-\x7E]/g, '').replace(/"/g, '')
  const utf8Name = encodeURIComponent(baseName)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      'Cache-Control': 'private, no-store',
    },
  })
}
