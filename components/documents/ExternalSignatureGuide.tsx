import { FileCheck2, FileDown, ShieldCheck, Signature } from 'lucide-react'

export default function ExternalSignatureGuide({
  audience = 'professor',
  compact = false,
}: {
  audience?: 'professor' | 'student'
  compact?: boolean
}) {
  return (
    <div
      className={`rounded-[1.5rem] border border-amber-200 bg-amber-50/90 ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
          <Signature className="h-5 w-5" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
              Fluxo de assinatura
            </p>
            <h3 className="mt-1 text-sm font-black text-amber-950">
              {audience === 'professor'
                ? 'Assinatura externa via ZapSign'
                : 'Assinatura formal do contrato'}
            </h3>
          </div>

          {audience === 'professor' ? (
            <>
              <p className="text-sm leading-6 text-amber-900/80">
                Como a conta gratuita do ZapSign não oferece API, o processo é manual:
                emita o contrato aqui na plataforma, baixe o PDF pronto e envie o arquivo
                para assinatura na plataforma externa.
              </p>
              <div className={`grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
                <div className="rounded-2xl bg-white/80 p-3">
                  <FileCheck2 className="mb-2 h-4 w-4 text-amber-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    1. Emitir
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-900/80">
                    Congele a versão do contrato no portal.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <FileDown className="mb-2 h-4 w-4 text-amber-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    2. Baixar PDF
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-900/80">
                    Use a opção de impressão e salvar em PDF.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <Signature className="mb-2 h-4 w-4 text-amber-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    3. Enviar no ZapSign
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-900/80">
                    Suba o PDF manualmente para coleta de assinaturas.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <ShieldCheck className="mb-2 h-4 w-4 text-amber-700" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    4. Validade externa
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-900/80">
                    A assinatura jurídica válida fica registrada na plataforma externa.
                  </p>
                </div>
              </div>
              <p className="text-xs font-medium leading-5 text-amber-900/75">
                Plano gratuito do ZapSign: até 5 documentos por mês, com notificações de
                status, lembretes e trilha de auditoria no próprio ZapSign.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-amber-900/80">
                O aceite digital mostrado no portal serve como registro operacional interno.
                Quando a escola optar por assinatura formal, a versão válida do contrato será
                enviada para assinatura em plataforma externa, como o ZapSign.
              </p>
              <p className="text-xs font-medium leading-5 text-amber-900/75">
                Se o professor enviar o contrato por plataforma externa, a trilha jurídica de
                assinatura passa a valer pela ferramenta de assinatura utilizada, e não apenas
                pelo aceite interno exibido aqui.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
