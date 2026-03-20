import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { addDays, isWeekend, isSameDay } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFifthBusinessDay(year: number, month: number): Date {
  let date = new Date(year, month - 1, 1)
  let count = 0
  while (count < 5) {
    if (!isWeekend(date)) count++
    if (count < 5) date = addDays(date, 1)
  }
  return date
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function horasAteAula(dataHora: string): number {
  const now = new Date()
  const aula = new Date(dataHora)
  return (aula.getTime() - now.getTime()) / (1000 * 60 * 60)
}

export function getSemestreAtual(): { semestre: 'jan-jun' | 'jul-dez'; ano: number; inicio: Date; fim: Date } {
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()
  if (mes <= 6) {
    return { semestre: 'jan-jun', ano, inicio: new Date(ano, 0, 1), fim: new Date(ano, 5, 30) }
  }
  return { semestre: 'jul-dez', ano, inicio: new Date(ano, 6, 1), fim: new Date(ano, 11, 31) }
}

export function gerarGradeAulas(
  dataInicio: Date,
  dataFim: Date,
  diaDaSemana: number[], // 0=dom, 1=seg ... 6=sab
  totalAulas: number
): Date[] {
  const aulas: Date[] = []
  let current = new Date(dataInicio)

  while (aulas.length < totalAulas && current <= dataFim) {
    if (diaDaSemana.includes(current.getDay())) {
      aulas.push(new Date(current))
    }
    current = addDays(current, 1)
  }
  return aulas
}

export function maskCPF(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

export function maskPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length <= 10) {
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }
  return cleanValue
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
}
export function maskDate(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1')
}
