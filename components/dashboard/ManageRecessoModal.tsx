'use client'

import { useState } from 'react'
import { Calendar, Flag, Info, Plus, Trash2, Umbrella } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

type RecessoType = 'feriado' | 'recesso'

type RecessoItem = {
  id: string
  titulo: string
  data_inicio: string
  data_fim: string
  tipo: RecessoType
}

interface Props {
  onSuccess: () => void
  existingRecessos: RecessoItem[]
}

export default function ManageRecessoModal({ onSuccess, existingRecessos }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [tipo, setTipo] = useState<RecessoType>('recesso')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !dataInicio || !dataFim) return toast.error('Preencha todos os campos')

    setLoading(true)
    try {
      const res = await fetch('/api/recessos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, data_inicio: dataInicio, data_fim: dataFim, tipo }),
      })

      if (!res.ok) throw new Error('Erro ao salvar')

      toast.success('Evento adicionado com sucesso!')
      setTitulo('')
      setDataInicio('')
      setDataFim('')
      setOpen(false)
      onSuccess()
    } catch {
      toast.error('Ocorreu um erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este evento?')) return

    try {
      const res = await fetch(`/api/recessos?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar')
      toast.success('Evento removido')
      onSuccess()
    } catch {
      toast.error('Erro ao deletar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-8 py-4 rounded-2xl lms-gradient text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
          <Plus className="w-4 h-4" /> Configurar Datas
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
        <div className="lms-gradient h-2 w-full" />
        <div className="p-8 space-y-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              Gerenciar Calendario
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Titulo do Evento</Label>
                <Input placeholder="Ex: Ferias Julho, Carnaval..." className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data Inicio</Label>
              <Input type="date" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Data Fim</Label>
              <Input type="date" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tipo de Evento</Label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as RecessoType)} className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                <option value="recesso">Recesso / Ferias do Professor</option>
                <option value="feriado">Feriado Nacional / Pontual</option>
              </Select>
              {tipo === 'recesso' && (
                <p className="text-[9px] text-orange-600 font-bold mt-2 uppercase tracking-tight flex items-center gap-1">
                  <Umbrella className="w-3 h-3" /> Aulas neste periodo serao marcadas para remarcacao.
                </p>
              )}
            </div>

            <Button disabled={loading} className="md:col-span-2 h-14 rounded-2xl lms-gradient text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">
              {loading ? 'Salvando...' : 'Adicionar ao Calendario'}
            </Button>
          </form>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Eventos Registrados
            </h4>
            <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {existingRecessos.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${r.tipo === 'recesso' ? 'bg-orange-100 text-orange-600' : 'bg-rose-100 text-rose-600'}`}>
                      {r.tipo === 'recesso' ? <Umbrella className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 leading-none">{r.titulo}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                        {new Date(`${r.data_inicio}T12:00:00`).toLocaleDateString('pt-BR')} - {new Date(`${r.data_fim}T12:00:00`).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {existingRecessos.length === 0 && (
                <p className="text-[10px] text-center text-slate-300 font-bold uppercase py-4">Nenhum evento registrado</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
