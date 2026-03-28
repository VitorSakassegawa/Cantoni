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
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-500">Operacoes manuais</p>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900">Central de Cron</h1>
          <p className="text-sm font-medium leading-7 text-slate-600">
            Esta area concentra as rotinas administrativas que antes poderiam rodar automaticamente.
            No plano Hobby da Vercel, cron jobs so podem executar uma vez por dia e ainda sem precisao
            fina de horario. Por isso, mantivemos automatico apenas o financeiro diario e trouxemos os
            demais gatilhos para execucao manual segura pelo professor.
          </p>
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/90 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Limitacoes do plano Hobby</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                A Vercel Hobby so aceita cron automatico com execucao diaria.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                A invocacao nao tem precisao garantida: um horario configurado pode rodar em qualquer momento daquela hora.
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700">
                Por isso, lembretes e transcripts ficam manuais, e so o financeiro atrasado segue automatico.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <ManualCronCard
          label="Financeiro"
          title="Marcar pagamentos atrasados"
          description="Varre as parcelas pendentes com vencimento anterior a hoje e atualiza o status local para atrasado. Esta e a unica rotina mantida em cron automatico na Vercel, mas o professor tambem pode executa-la manualmente para forcar a atualizacao imediata do painel financeiro."
          details={[
            'Uso recomendado: no inicio do dia ou apos ajustar pagamentos manualmente.',
            'Efeito esperado: contratos e indicadores financeiros refletem o atraso no painel.',
            'Permanece automatico: 1x por dia na Vercel Hobby.',
          ]}
          endpoint="/api/professor/cron/marcar-atrasados"
          badge="Automatico + manual"
        />

        <ManualCronCard
          label="Lembretes"
          title="Enviar lembretes de aula"
          description="Na execucao manual, procura aulas agendadas nas proximas 24 horas e envia os lembretes pendentes por e-mail. Essa rotina saiu do cron automatico para respeitar a limitacao do plano Hobby da Vercel."
          details={[
            'Uso recomendado: quando quiser disparar os lembretes das proximas 24 horas, inclusive aulas de hoje mais tarde.',
            'Efeito esperado: envia e marca reminder_sent para nao repetir indevidamente.',
            'A rota automatica continua reservada para janelas mais controladas do dia seguinte.',
          ]}
          endpoint="/api/professor/cron/lembretes-aula"
          badge="Manual"
        />

        <ManualCronCard
          label="Google Meet"
          title="Importar transcripts e gerar resumo"
          description="Busca transcricoes elegiveis do Google Meet, importa o conteudo para a aula e atualiza resumo, homework e flashcards quando houver material disponivel. O processamento continua respeitando a janela minima de 30 minutos apos a aula."
          details={[
            'Uso recomendado: apos concluir aulas e aguardar a transcript aparecer no Google Meet.',
            'Efeito esperado: preenche class_notes, resumo da IA, homework e vocabulario.',
            'Limitacao Vercel Hobby: execucoes a cada 30 minutos nao podem ficar automaticas.',
          ]}
          endpoint="/api/professor/aulas/importar-transcricoes"
          actionLabel="Importar agora"
          badge="Manual"
          resultKind="transcript"
        />
      </div>
    </div>
  )
}
