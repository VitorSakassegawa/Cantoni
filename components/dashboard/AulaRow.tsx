'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import type { Aula } from '@/lib/types'
import { Video, RotateCcw, X } from 'lucide-react'

interface Props {
  aula: Aula
  index: number
  isProfessor?: boolean
}

const STATUS_BADGE: Record<string, any> = {
  agendada: 'secondary',
  confirmada: 'default',
  dada: 'success',
  cancelada: 'outline',
  remarcada: 'warning',
}

export default function AulaRow({ aula, index, isProfessor }: Props) {
  const [status, setStatus] = useState(aula.status)
  const [loadingCancel, setLoadingCancel] = useState(false)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [novaData, setNovaData] = useState('')
  const [loadingRemark, setLoadingRemark] = useState(false)

  const canCancel = ['agendada', 'confirmada'].includes(status)
  const canRemark = ['agendada', 'confirmada', 'cancelada'].includes(status)

  async function handleCancel() {
    if (!confirm('Cancelar esta aula?')) return
    setLoadingCancel(true)
    const res = await fetch('/api/aulas/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aulaId: aula.id }),
    })
    const data = await res.json()
    if (data.success) setStatus(data.status)
    setLoadingCancel(false)
  }

  async function handleRemark() {
    if (!novaData) return
    setLoadingRemark(true)
    const res = await fetch('/api/aulas/remarcar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aulaId: aula.id, novaDataHora: novaData }),
    })
    const data = await res.json()
    if (data.success) {
      setStatus('remarcada')
      setShowRemarkModal(false)
    } else {
      alert(data.error || 'Erro ao remarcar')
    }
    setLoadingRemark(false)
  }

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="py-2 text-gray-400">{index}</td>
        <td className="py-2 font-medium">{formatDateTime(aula.data_hora)}</td>
        <td className="py-2">
          <Badge variant={STATUS_BADGE[status] || 'outline'}>{status}</Badge>
        </td>
        <td className="py-2">
          {aula.meet_link ? (
            <a href={aula.meet_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-900 hover:underline text-xs">
              <Video className="w-3 h-3" /> Meet
            </a>
          ) : '—'}
        </td>
        <td className="py-2 text-xs text-gray-500 max-w-xs truncate">
          {aula.homework || '—'}
          {aula.homework && (
            <span className={`ml-1 ${aula.homework_completed ? 'text-green-600' : 'text-yellow-600'}`}>
              {aula.homework_completed ? '✓' : '⏳'}
            </span>
          )}
        </td>
        <td className="py-2">
          <div className="flex gap-1">
            {canRemark && (
              <Button size="sm" variant="ghost" onClick={() => setShowRemarkModal(true)} title="Remarcar">
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={loadingCancel} title="Cancelar">
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {showRemarkModal && (
        <tr>
          <td colSpan={6} className="py-2 px-4 bg-blue-50">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Nova data/hora:</span>
              <input
                type="datetime-local"
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              />
              <Button size="sm" onClick={handleRemark} disabled={loadingRemark}>
                {loadingRemark ? 'Salvando...' : 'Confirmar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRemarkModal(false)}>Cancelar</Button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
