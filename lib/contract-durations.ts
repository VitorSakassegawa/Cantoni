// Catálogo de durações de contrato ("cardápio"). Contagem de aulas FIXA por
// tier (decisão de negócio): previsível para o aluno e para o caixa.
// Apenas 'semestral' fica travado no semestre (jan-jun / jul-dez); as demais
// durações podem cruzar a fronteira jun/jul livremente.

export type ContractDuration = 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

export type DurationSpec = {
  months: number
  lessons1x: number
  lessons2x: number
  installmentsMax: number // parcelas = nº de meses do tier
  semesterLocked: boolean
  label: string
}

export const DURATION_SPECS: Record<ContractDuration, DurationSpec> = {
  mensal: { months: 1, lessons1x: 4, lessons2x: 8, installmentsMax: 1, semesterLocked: false, label: 'Mensal' },
  bimestral: { months: 2, lessons1x: 8, lessons2x: 16, installmentsMax: 2, semesterLocked: false, label: 'Bimestral' },
  trimestral: { months: 3, lessons1x: 12, lessons2x: 24, installmentsMax: 3, semesterLocked: false, label: 'Trimestral' },
  semestral: { months: 6, lessons1x: 20, lessons2x: 40, installmentsMax: 6, semesterLocked: true, label: 'Semestral' },
  anual: { months: 12, lessons1x: 40, lessons2x: 80, installmentsMax: 12, semesterLocked: false, label: 'Anual' },
}

export function isContractDuration(value: string | null | undefined): value is ContractDuration {
  return !!value && value in DURATION_SPECS
}

export function lessonsForDuration(duration: ContractDuration, freq: 1 | 2): number {
  const spec = DURATION_SPECS[duration]
  return freq === 2 ? spec.lessons2x : spec.lessons1x
}

export function installmentsForDuration(duration: ContractDuration): number {
  return DURATION_SPECS[duration].installmentsMax
}
