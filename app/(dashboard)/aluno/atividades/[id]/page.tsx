'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { getAtividadeParaResponder, submitAtividade } from '@/lib/actions/atividades'
import type { QuestaoAluno, RespostaAluno } from '@/lib/atividades-utils'
import { ArrowLeft, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react'

type AtividadeView = Awaited<ReturnType<typeof getAtividadeParaResponder>>
type SubmitResult = Awaited<ReturnType<typeof submitAtividade>>

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado'
}

export default function ResponderAtividadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [atividade, setAtividade] = useState<AtividadeView | null>(null)
  const [loading, setLoading] = useState(true)
  const [respostas, setRespostas] = useState<Record<number, RespostaAluno['valor']>>({})
  const [ordem, setOrdem] = useState<Record<number, number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [resultado, setResultado] = useState<SubmitResult | null>(null)

  useEffect(() => {
    let active = true
    getAtividadeParaResponder(id)
      .then((data) => {
        if (active) setAtividade(data)
      })
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  function setResposta(qid: number, valor: RespostaAluno['valor']) {
    setRespostas((prev) => ({ ...prev, [qid]: valor }))
  }

  function toggleOrdemItem(q: QuestaoAluno, shuffledIdx: number) {
    setOrdem((prev) => {
      const atual = prev[q.id] || []
      const next = atual.includes(shuffledIdx) ? atual.filter((i) => i !== shuffledIdx) : [...atual, shuffledIdx]
      setResposta(q.id, next)
      return { ...prev, [q.id]: next }
    })
  }

  async function handleSubmit() {
    if (!atividade) return
    const payload: RespostaAluno[] = atividade.questoes.map((q) => ({
      id: q.id,
      valor: respostas[q.id] ?? (q.tipo === 'ordenar' ? [] : ''),
    }))
    const semResposta = atividade.questoes.filter((q) => {
      const v = respostas[q.id]
      if (v === undefined || v === null || v === '') return true
      if (Array.isArray(v) && q.itens && v.length !== q.itens.length) return true
      return false
    })
    if (semResposta.length > 0) {
      toast.error(`Responda todas as questões antes de enviar (${semResposta.length} pendente(s)).`)
      return
    }

    setSubmitting(true)
    try {
      const result = await submitAtividade(atividade.id, payload)
      setResultado(result)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Carregando atividade...</p>
      </div>
    )
  }

  if (!atividade) {
    return (
      <div className="mx-auto max-w-xl py-24 text-center space-y-4">
        <p className="text-lg font-black text-slate-700">Atividade não encontrada</p>
        <Link href="/aluno/atividades" className="text-sm font-bold text-indigo-600">Voltar</Link>
      </div>
    )
  }

  // resultado pós-envio ou atividade já entregue
  const finished = resultado || atividade.status !== 'pendente'
  if (finished) {
    const acertos = resultado?.acertos ?? atividade.resultado?.acertos ?? 0
    const total = resultado?.totalObjetivas ?? atividade.resultado?.totalObjetivas ?? 0
    const nota = resultado?.nota ?? atividade.resultado?.nota ?? null
    const aguardando = (resultado?.status ?? atividade.status) === 'entregue'
    const corretasById = new Map((resultado?.detalhes || []).map((d) => [d.id, d.correta]))

    return (
      <div className="mx-auto max-w-2xl animate-fade-in space-y-8 py-10 px-4">
        <div className="rounded-[2.5rem] bg-white p-10 text-center shadow-2xl border border-slate-100 space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{atividade.titulo}</h1>
          {total > 0 ? (
            <p className="text-5xl font-black text-indigo-600">
              {acertos}<span className="text-2xl text-slate-300">/{total}</span>
            </p>
          ) : null}
          {nota !== null ? (
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-sm font-black px-4 py-1">
              Nota {Number(nota).toFixed(1)}
            </Badge>
          ) : null}
          {aguardando ? (
            <p className="text-sm font-medium text-slate-500">
              Suas respostas dissertativas foram enviadas — o professor vai revisar e te dar um feedback.
            </p>
          ) : null}
          {atividade.resultado?.feedback ? (
            <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4 text-left">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-1">Feedback do professor</p>
              <p className="text-sm font-medium text-slate-700">{atividade.resultado.feedback}</p>
            </div>
          ) : null}
        </div>

        {resultado ? (
          <div className="space-y-3">
            {atividade.questoes.map((q) => {
              const correta = corretasById.get(q.id)
              if (correta === null || correta === undefined) return null
              return (
                <div
                  key={q.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    correta ? 'border-emerald-100 bg-emerald-50/60' : 'border-rose-100 bg-rose-50/60'
                  }`}
                >
                  {correta ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  )}
                  <p className="text-sm font-bold text-slate-800">{q.id}. {q.enunciado}</p>
                </div>
              )
            })}
          </div>
        ) : null}

        <div className="text-center">
          <Link
            href="/aluno/atividades"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para atividades
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-8 py-8 px-4 pb-24">
      <Link
        href="/aluno/atividades"
        className="group inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Atividades
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {atividade.nivel ? (
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[11px] font-black uppercase">
              {atividade.nivel}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[11px] font-bold text-slate-500">
            {atividade.questoes.length} questões
          </Badge>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">{atividade.titulo}</h1>
        {atividade.descricao ? (
          <p className="text-sm font-medium text-slate-500">{atividade.descricao}</p>
        ) : null}
      </div>

      <div className="space-y-6">
        {atividade.questoes.map((q) => (
          <div key={q.id} className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <p className="text-sm font-black text-slate-900 leading-relaxed">
              {q.id}. {q.enunciado}
            </p>

            {q.tipo === 'multipla_escolha' && q.opcoes ? (
              <div className="grid gap-2">
                {q.opcoes.map((opcao, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResposta(q.id, idx)}
                    aria-pressed={respostas[q.id] === idx}
                    className={`rounded-xl border-2 p-3 text-left text-sm font-bold transition-all ${
                      respostas[q.id] === idx
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200'
                    }`}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            ) : null}

            {q.tipo === 'verdadeiro_falso' ? (
              <div className="flex gap-2">
                {[
                  { v: true, label: 'Verdadeiro' },
                  { v: false, label: 'Falso' },
                ].map(({ v, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setResposta(q.id, v)}
                    aria-pressed={respostas[q.id] === v}
                    className={`flex-1 rounded-xl border-2 p-3 text-sm font-black uppercase tracking-wide transition-all ${
                      respostas[q.id] === v
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {q.tipo === 'lacunas' ? (
              <Input
                value={(respostas[q.id] as string) || ''}
                onChange={(e) => setResposta(q.id, e.target.value)}
                placeholder="Digite a palavra que completa a frase"
                className="h-12 rounded-xl font-bold"
                aria-label={`Resposta da questão ${q.id}`}
              />
            ) : null}

            {q.tipo === 'ordenar' && q.itens ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400">
                  Toque nos itens na ordem correta. Toque de novo para desfazer.
                </p>
                <div className="flex flex-wrap gap-2">
                  {q.itens.map((item, shuffledIdx) => {
                    const position = (ordem[q.id] || []).indexOf(shuffledIdx)
                    const selected = position !== -1
                    return (
                      <button
                        key={shuffledIdx}
                        type="button"
                        onClick={() => toggleOrdemItem(q, shuffledIdx)}
                        aria-pressed={selected}
                        className={`relative rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${
                          selected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
                        }`}
                      >
                        {selected ? (
                          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-white">
                            {position + 1}
                          </span>
                        ) : null}
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {q.tipo === 'dissertativa' ? (
              <Textarea
                value={(respostas[q.id] as string) || ''}
                onChange={(e) => setResposta(q.id, e.target.value)}
                placeholder="Escreva sua resposta em inglês"
                className="rounded-xl min-h-[110px] font-medium"
                aria-label={`Resposta da questão ${q.id}`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="sticky bottom-4">
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full h-16 rounded-[1.8rem] lms-gradient text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {submitting ? 'Corrigindo...' : 'Enviar respostas'}
        </Button>
      </div>
    </div>
  )
}
