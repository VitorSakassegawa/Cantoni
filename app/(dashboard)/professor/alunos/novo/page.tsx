'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

const DIAS_SEMANA = [
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 },
  { label: 'Sábado', value: 6 },
]

export default function NovoAlunoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'aluno' | 'contrato'>('aluno')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newAlunoId, setNewAlunoId] = useState('')

  // Aluno form
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [nivel, setNivel] = useState('iniciante')
  const [tipoAula, setTipoAula] = useState('regular')
  const [cpf, setCpf] = useState('')
  const [birthDate, setBirthDate] = useState('')

  // Contrato form
  const [planoId, setPlanoId] = useState('1')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [horario, setHorario] = useState('18:00')
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([])
  const [valor, setValor] = useState('')
  const [livro, setLivro] = useState('')

  function toggleDia(dia: number) {
    setDiasSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  async function handleCriarAluno(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create auth user
      const { data: authData, error: authErr } = await supabase.auth.admin?.createUser({
        email,
        password: Math.random().toString(36).slice(-10),
        email_confirm: true,
      }) as any

      // Fallback: use service role via API
      const res = await fetch('/api/alunos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone, nivel, tipoAula, cpf, birthDate }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro ao criar aluno')
      setNewAlunoId(data.alunoId)
      setStep('contrato')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCriarContrato(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const planoNum = parseInt(planoId)
      const freqSemana = planoNum === 1 ? 1 : 2
      const semestre = new Date(dataInicio).getMonth() < 6 ? 'jan-jun' : 'jul-dez'
      const ano = new Date(dataInicio).getFullYear()

      const res = await fetch('/api/contratos/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alunoId: newAlunoId,
          planoId: planoNum,
          dataInicio,
          dataFim,
          semestre,
          ano,
          diasDaSemana: diasSelecionados,
          horario,
          valor: parseFloat(valor),
          livroAtual: livro,
          nivelAtual: nivel,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar contrato')

      router.push(`/professor/alunos/${newAlunoId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'contrato') {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-blue-900">Configurar Contrato</h1>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCriarContrato} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={planoId} onChange={e => setPlanoId(e.target.value)}>
                  <option value="1">1x por semana — 20 aulas/semestre</option>
                  <option value="2">2x por semana — 40 aulas/semestre</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data início</Label>
                  <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Data fim</Label>
                  <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Horário da aula</Label>
                <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(dia => (
                    <button
                      key={dia.value}
                      type="button"
                      onClick={() => toggleDia(dia.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        diasSelecionados.includes(dia.value)
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'border-gray-300 hover:border-blue-900'
                      }`}
                    >
                      {dia.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Valor total do semestre (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Será dividido em 6 parcelas mensais</p>
              </div>

              <div className="space-y-1.5">
                <Label>Livro/Material atual</Label>
                <Input
                  placeholder="Ex: Evolve 1 (Cambridge)"
                  value={livro}
                  onChange={e => setLivro(e.target.value)}
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep('aluno')}>Voltar</Button>
                <Button type="submit" disabled={loading || diasSelecionados.length === 0}>
                  {loading ? 'Criando...' : 'Criar contrato e aulas'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-blue-900">Novo Aluno</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleCriarAluno} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone (opcional)</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nível</Label>
              <Select value={nivel} onChange={e => setNivel(e.target.value)}>
                <option value="iniciante">Iniciante</option>
                <option value="basico">Básico</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
                <option value="conversacao">Conversação</option>
                <option value="certificado">Preparatório para Certificação</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de aula</Label>
              <Select value={tipoAula} onChange={e => setTipoAula(e.target.value)}>
                <option value="regular">Regular (Série Evolve)</option>
                <option value="conversacao">Conversação</option>
                <option value="certificado">Certificação</option>
              </Select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Continuar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
