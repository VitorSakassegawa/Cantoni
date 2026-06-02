'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, History, Save, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { applyPercentToPricing, type ContractPricing } from '@/lib/pricing'

type Adjustment = {
  id: number
  kind: 'ipca' | 'manual'
  percent: number | null
  prices_before: ContractPricing
  prices_after: ContractPricing
  note: string | null
  created_at: string
}

type NumericPriceKey = 'semestral1x' | 'semestral2x' | 'avulsa'

const PRICE_FIELDS: Array<{ key: NumericPriceKey; label: string; hint: string }> = [
  { key: 'semestral1x', label: 'Semestral · 1x por semana', hint: 'Pacote do semestre (20 aulas)' },
  { key: 'semestral2x', label: 'Semestral · 2x por semana', hint: 'Pacote do semestre (40 aulas)' },
  { key: 'avulsa', label: 'Aula avulsa', hint: 'Valor por aula (contrato personalizado / hora-aula)' },
]

type MenuTier = 'mensal' | 'bimestral' | 'trimestral' | 'anual'
const MENU_TIER_FIELDS: Array<{ key: MenuTier; label: string; lessons: string }> = [
  { key: 'mensal', label: 'Mensal', lessons: '4 / 8 aulas' },
  { key: 'bimestral', label: 'Bimestral', lessons: '8 / 16 aulas' },
  { key: 'trimestral', label: 'Trimestral', lessons: '12 / 24 aulas' },
  { key: 'anual', label: 'Anual', lessons: '40 / 80 aulas' },
]

export default function PricingSettingsClient({
  initialPricing,
  adjustments,
}: {
  initialPricing: ContractPricing
  adjustments: Adjustment[]
}) {
  const router = useRouter()
  const [prices, setPrices] = useState<ContractPricing>(initialPricing)
  const [saving, setSaving] = useState(false)
  const [percent, setPercent] = useState('')
  const [applyingIpca, setApplyingIpca] = useState(false)
  // Justificativa obrigatória: toda alteração de preço impacta contratos futuros.
  const [justification, setJustification] = useState('')
  const [ipcaJustification, setIpcaJustification] = useState('')

  const parsedPercent = Number(percent.replace(',', '.'))
  const ipcaPreview =
    Number.isFinite(parsedPercent) && parsedPercent > 0 ? applyPercentToPricing(prices, parsedPercent) : null

  function setPrice(key: NumericPriceKey, value: string) {
    const n = Number(value.replace(',', '.'))
    setPrices((current) => ({ ...current, [key]: Number.isFinite(n) ? n : 0 }))
  }

  function setTierPrice(tier: MenuTier, freq: 1 | 2, value: string) {
    const n = Number(value.replace(',', '.'))
    const amount = Number.isFinite(n) && n > 0 ? n : 0
    setPrices((current) => {
      const tiers = { ...(current.tiers || {}) }
      const existing = tiers[tier] || { price1x: 0, price2x: 0 }
      tiers[tier] = { ...existing, [freq === 1 ? 'price1x' : 'price2x']: amount }
      return { ...current, tiers }
    })
  }

  async function handleSave() {
    if (justification.trim().length < 3) {
      toast.error('Informe uma justificativa para a alteração (mín. 3 caracteres).')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/professor/precos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prices, note: justification.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.')
      setPrices(data.pricing)
      setJustification('')
      toast.success('Preços atualizados (alteração registrada com justificativa).')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar os preços.')
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyIpca() {
    if (!ipcaPreview) {
      toast.error('Informe um percentual de reajuste válido.')
      return
    }
    if (ipcaJustification.trim().length < 3) {
      toast.error('Informe uma justificativa para o reajuste (mín. 3 caracteres).')
      return
    }
    setApplyingIpca(true)
    try {
      const res = await fetch('/api/professor/precos/reajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          percent: parsedPercent,
          note: `Reajuste IPCA de ${parsedPercent}% — ${ipcaJustification.trim()}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao aplicar o reajuste.')
      setPrices(data.pricing)
      setPercent('')
      setIpcaJustification('')
      toast.success(`Reajuste de ${parsedPercent}% aplicado aos preços-padrão.`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao aplicar o reajuste.')
    } finally {
      setApplyingIpca(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
          <DollarSign className="w-6 h-6" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Configurações de Preços</h1>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
            Tabela de valores por tipo de contrato
          </p>
        </div>
      </div>

      {/* Preços-padrão */}
      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="pb-6 border-b border-slate-100">
          <CardTitle className="text-xs font-black text-blue-500 flex items-center gap-2 uppercase tracking-[0.2em]">
            <DollarSign className="w-4 h-4" aria-hidden="true" /> Preços-padrão
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {PRICE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`price-${field.key}`} className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  {field.label}
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600">R$</span>
                  <Input
                    id={`price-${field.key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={String(prices[field.key])}
                    onChange={(e) => setPrice(field.key, e.target.value)}
                    className="h-14 pl-10 rounded-2xl bg-slate-50 border-slate-100 font-black text-slate-900"
                  />
                </div>
                <p className="text-[11px] font-medium text-slate-400">{field.hint}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price-justification" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              Justificativa da alteração *
            </Label>
            <textarea
              id="price-justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Ex.: reajuste de tabela, nova política comercial, correção de valor..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
            <p className="text-[11px] font-medium text-slate-400">
              Obrigatória — registrada no histórico (impacta contratos futuros).
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-12 px-8 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {saving ? 'Salvando...' : 'Salvar preços'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cardápio de durações (mensal → anual) */}
      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="pb-6 border-b border-slate-100">
          <CardTitle className="text-xs font-black text-blue-500 flex items-center gap-2 uppercase tracking-[0.2em]">
            <DollarSign className="w-4 h-4" aria-hidden="true" /> Cardápio de durações
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <p className="text-sm font-medium leading-relaxed text-slate-500">
            Preço-pacote por duração. Semestral e avulsa ficam acima; aqui você ajusta as demais
            durações do cardápio. Quanto maior o compromisso, menor deve ser o preço por aula.
          </p>
          <div className="space-y-4">
            {MENU_TIER_FIELDS.map((tier) => (
              <div key={tier.key} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_1fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-600">{tier.label}</p>
                  <p className="text-[11px] font-medium text-slate-400">{tier.lessons} (1x / 2x)</p>
                </div>
                {([1, 2] as const).map((freq) => {
                  const current = prices.tiers?.[tier.key]
                  const val = freq === 1 ? current?.price1x : current?.price2x
                  return (
                    <div key={freq} className="space-y-1.5">
                      <Label
                        htmlFor={`tier-${tier.key}-${freq}`}
                        className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400"
                      >
                        Pacote {freq}x
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600">R$</span>
                        <Input
                          id={`tier-${tier.key}-${freq}`}
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={val !== undefined ? String(val) : ''}
                          placeholder="0,00"
                          onChange={(e) => setTierPrice(tier.key, freq, e.target.value)}
                          className="h-12 pl-10 rounded-2xl bg-slate-50 border-slate-100 font-black text-slate-900"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tier-justification" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              Justificativa da alteração *
            </Label>
            <textarea
              id="tier-justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Ex.: nova faixa de preço, ajuste de margem, condição comercial..."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
            <p className="text-[11px] font-medium text-slate-400">
              Obrigatória — registrada no histórico (impacta contratos futuros).
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-12 px-8 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              {saving ? 'Salvando...' : 'Salvar cardápio'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reajuste anual (IPCA) */}
      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="pb-6 border-b border-slate-100">
          <CardTitle className="text-xs font-black text-amber-600 flex items-center gap-2 uppercase tracking-[0.2em]">
            <TrendingUp className="w-4 h-4" aria-hidden="true" /> Reajuste anual (IPCA)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Informe o IPCA acumulado do período para reajustar todos os preços-padrão de uma vez. O reajuste vale para{' '}
            <strong className="font-black text-slate-700">contratos novos</strong> criados a partir daqui — contratos já
            existentes não são alterados.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2 sm:w-56">
              <Label htmlFor="ipca-percent" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                Percentual (%)
              </Label>
              <div className="relative">
                <Input
                  id="ipca-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  placeholder="Ex.: 4,62"
                  className="h-14 pr-9 rounded-2xl bg-slate-50 border-slate-100 font-black text-slate-900"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
              </div>
            </div>
            <Button
              onClick={handleApplyIpca}
              disabled={applyingIpca || !ipcaPreview}
              className="h-14 px-8 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-widest gap-2 disabled:opacity-50"
            >
              {applyingIpca ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <TrendingUp className="w-4 h-4" aria-hidden="true" />}
              {applyingIpca ? 'Aplicando...' : 'Aplicar reajuste'}
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ipca-justification" className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              Justificativa do reajuste *
            </Label>
            <textarea
              id="ipca-justification"
              value={ipcaJustification}
              onChange={(e) => setIpcaJustification(e.target.value)}
              rows={2}
              placeholder="Ex.: IPCA acumulado de 2025 (jan–dez) conforme índice oficial."
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
            />
            <p className="text-[11px] font-medium text-slate-400">
              Obrigatória — registrada no histórico (impacta contratos futuros).
            </p>
          </div>

          {ipcaPreview ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-3">Prévia após reajuste</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {PRICE_FIELDS.map((field) => (
                  <div key={field.key} className="text-sm">
                    <p className="text-[11px] font-bold uppercase tracking-tight text-slate-400">{field.label}</p>
                    <p className="font-black text-slate-700">
                      {formatCurrency(prices[field.key])} <span className="text-amber-600">→ {formatCurrency(ipcaPreview[field.key])}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card className="glass-card border-none overflow-hidden">
        <CardHeader className="pb-6 border-b border-slate-100">
          <CardTitle className="text-xs font-black text-slate-500 flex items-center gap-2 uppercase tracking-[0.2em]">
            <History className="w-4 h-4" aria-hidden="true" /> Histórico de reajustes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {adjustments.length === 0 ? (
            <p className="text-sm font-medium text-slate-400 py-4 text-center">Nenhum reajuste registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {adjustments.map((adj) => (
                <li key={adj.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] font-black uppercase tracking-widest border-none ${adj.kind === 'ipca' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {adj.kind === 'ipca' ? `IPCA ${adj.percent ?? ''}%` : 'Manual'}
                      </Badge>
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(adj.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {adj.note ? <p className="mt-1 text-xs text-slate-500 truncate">{adj.note}</p> : null}
                  </div>
                  <div className="text-right text-[11px] font-bold text-slate-500 shrink-0">
                    {formatCurrency(adj.prices_before?.semestral1x ?? 0)} → {formatCurrency(adj.prices_after?.semestral1x ?? 0)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
