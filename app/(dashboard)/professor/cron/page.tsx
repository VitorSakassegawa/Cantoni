import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ManualCronCard from '@/components/dashboard/ManualCronCard'

export default async function ProfessorCronPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'professor') {
    redirect('/aluno')
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2.5rem] border border-white/30 bg-white/80 p-8 shadow-2xl shadow-blue-900/5 backdrop-blur">
        <div className="max-w-4xl space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-500">Operações manuais</p>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Central de Cron</h1>
          <p className="text-sm font-medium leading-7 text-slate-600">
            Esta área concentra as rotinas administrativas que antes poderiam rodar automaticamente.
            No plano Hobby da Vercel, cron jobs só podem executar uma vez por dia e ainda sem precisão fina de horário.
            Por isso, mantivemos automático apenas o financeiro diário e trouxemos os demais gatilhos para execução manual segura pelo professor.
          </p>
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/90 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Limitações do plano Hobby</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                A Vercel Hobby só aceita cron automático com execução diária.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                A invocação não tem precisão garantida: um horário configurado pode rodar em qualquer momento daquela hora.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                Por isso, lembretes e transcripts ficam manuais, e só o financeiro atrasado segue automático.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <ManualCronCard
          label="Financeiro"
          title="Marcar pagamentos atrasados"
          description="Varre as parcelas pendentes com vencimento anterior a hoje e atualiza o status local para atrasado. Esta é a única rotina mantida em cron automático na Vercel, mas o professor também pode executá-la manualmente para forçar a atualização imediata do painel financeiro."
          details={[
            'Uso recomendado: no início do dia ou após ajustar pagamentos manualmente.',
            'Efeito esperado: contratos e indicadores financeiros refletem o atraso no painel.',
            'Permanece automático: 1x por dia na Vercel Hobby.',
          ]}
          endpoint="/api/professor/cron/marcar-atrasados"
          badge="Automático + manual"
        />

        <ManualCronCard
          label="Lembretes"
          title="Enviar lembretes de aula"
          description="Procura aulas agendadas para a janela de aproximadamente 24 horas à frente e envia os lembretes pendentes por e-mail. Essa rotina saiu do cron automático para respeitar a limitação do plano Hobby da Vercel."
          details={[
            'Uso recomendado: 1x por dia, quando quiser disparar os lembretes do dia seguinte.',
            'Efeito esperado: envia e marca reminder_sent para não repetir indevidamente.',
            'Limitação Vercel Hobby: expressões horárias falham no deploy.',
          ]}
          endpoint="/api/professor/cron/lembretes-aula"
          badge="Manual"
        />

        <ManualCronCard
          label="Google Meet"
          title="Importar transcripts e gerar resumo"
          description="Busca transcrições elegíveis do Google Meet, importa o conteúdo para a aula e atualiza resumo, homework e flashcards quando houver material disponível. O processamento continua respeitando a janela mínima de 30 minutos após a aula."
          details={[
            'Uso recomendado: após concluir aulas e aguardar a transcript aparecer no Google Meet.',
            'Efeito esperado: preenche class_notes, resumo da IA, homework e vocabulário.',
            'Limitação Vercel Hobby: execuções a cada 30 minutos não podem ficar automáticas.',
          ]}
          endpoint="/api/professor/aulas/importar-transcricoes"
          actionLabel="Importar agora"
          badge="Manual"
          resultFormatter={(payload) => {
            const imported = typeof payload.imported === 'number' ? payload.imported : 0
            const skipped = typeof payload.skipped === 'number' ? payload.skipped : 0
            const failed = typeof payload.failed === 'number' ? payload.failed : 0
            return `${imported} transcript(s) importada(s), ${skipped} pulada(s), ${failed} com falha.`
          }}
        />
      </div>
    </div>
  )
}
