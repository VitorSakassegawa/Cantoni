import { FERIADOS_NACIONAIS } from '../constants/holidays.ts'
import { DEFAULT_PRICING, packagePriceFor, type ContractPricing } from '../pricing.ts'
import {
  DURATION_SPECS,
  isContractDuration,
  lessonsForDuration,
} from '../contract-durations.ts'
import {
  startOfMonth,
  endOfMonth,
  differenceInMonths,
  eachDayOfInterval
} from 'date-fns'

const round2 = (n: number) => Math.round(n * 100) / 100

// Gera as próximas `target` datas de aula a partir de `start`, nos dias da
// semana escolhidos, pulando feriados. Usado pelas durações de contagem fixa.
function generateFixedLessonDates(start: Date, diasDaSemana: number[], target: number): Date[] {
  const dates: Date[] = []
  const cursor = new Date(start)
  let guard = 0
  while (dates.length < target && guard < 1200) {
    if (diasDaSemana.includes(cursor.getDay()) && !isHoliday(cursor)) {
      dates.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
    guard += 1
  }
  return dates
}

export const SEMESTERS = {
  1: { startMonth: 0, endMonth: 5, label: 'jan-jun', totalMonths: 6, maxRegular1x: 20, maxRegular2x: 40, price1x: 1920, price2x: 2880 },
  2: { startMonth: 6, endMonth: 11, label: 'jul-dez', totalMonths: 6, maxRegular1x: 20, maxRegular2x: 40, price1x: 1920, price2x: 2880 }
}

export function isHoliday(date: Date) {
  const dateStr = date.toISOString().split('T')[0]
  return FERIADOS_NACIONAIS.includes(dateStr)
}

export function getSemesterInfo(date: Date) {
  const month = date.getMonth()
  const year = date.getFullYear()
  
  if (month <= 5) { // Jan-Jun
    return {
      num: 1,
      ...SEMESTERS[1],
      start: new Date(year, 0, 1),
      end: new Date(year, 5, 30)
    }
  } else { // Jul-Dec
    return {
      num: 2,
      ...SEMESTERS[2],
      start: new Date(year, 6, 1),
      end: new Date(year, 11, 31)
    }
  }
}

export function calculateContractSpecs(
  startDate: Date,
  planoId: number,
  diasDaSemana: number[],
  tipoContrato: string = 'semestral',
  manualEndDate?: Date,
  pricing: ContractPricing = DEFAULT_PRICING
) {
  const sem = getSemesterInfo(startDate)

  // Fixed-count durations from the menu (mensal/bimestral/trimestral/anual):
  // generate exactly the tier's lesson count, skipping holidays. These may
  // cross the jun/jul boundary freely (only 'semestral' stays locked).
  if (isContractDuration(tipoContrato) && tipoContrato !== 'semestral') {
    const freqNum: 1 | 2 = planoId === 1 ? 1 : 2
    const targetLessons = lessonsForDuration(tipoContrato, freqNum)
    const lessonDates = generateFixedLessonDates(startDate, diasDaSemana, targetLessons)
    const computedEnd = lessonDates[lessonDates.length - 1] || startDate
    return {
      semesterLabel: sem.label,
      endDate: computedEnd,
      totalLessons: lessonDates.length,
      regularLessons: lessonDates.length,
      bonusLessons: 0,
      totalValue: round2(packagePriceFor(pricing, tipoContrato, freqNum)),
      remainingMonths: DURATION_SPECS[tipoContrato].months,
      lessonDates,
      isCrossSemester: false,
    }
  }

  const endDate = tipoContrato === 'semestral' ? sem.end : (manualEndDate || sem.end)

  // Count match weekdays excluding holidays
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
  const lessonDates = allDays.filter(d => 
    diasDaSemana.includes(d.getDay()) && !isHoliday(d)
  )

  const freq = planoId === 1 ? '1x' : '2x'
  const maxRegular = freq === '1x' ? sem.maxRegular1x : sem.maxRegular2x
  const fullPrice = freq === '1x' ? pricing.semestral1x : pricing.semestral2x
  
  let regularLessons = 0
  let bonusLessons = 0
  let totalValue = 0

  if (tipoContrato === 'semestral') {
    const unitRate = freq === '1x' ? pricing.semestral1x / sem.maxRegular1x : pricing.semestral2x / sem.maxRegular2x
    if (lessonDates.length >= maxRegular) {
      regularLessons = maxRegular
      bonusLessons = lessonDates.length - maxRegular
      totalValue = fullPrice
    } else {
      regularLessons = lessonDates.length
      bonusLessons = 0
      totalValue = regularLessons * unitRate
    }
  } else {
    // Ad-hoc / Personalizado (Hora/Aula)
    regularLessons = lessonDates.length
    bonusLessons = 0
    totalValue = regularLessons * pricing.avulsa
  }

  // Monthly installments calculation
  const startMonth = startOfMonth(startDate)
  const endMonthDate = endOfMonth(endDate)
  const remainingMonths = differenceInMonths(endMonthDate, startMonth) + 1

  return {
    semesterLabel: sem.label,
    endDate,
    totalLessons: lessonDates.length,
    regularLessons,
    bonusLessons,
    totalValue: Math.round(totalValue * 100) / 100,
    remainingMonths,
    lessonDates,
    isCrossSemester: tipoContrato === 'semestral' && (startDate.getMonth() <= 6 && endDate.getMonth() > 6)
  }
}

