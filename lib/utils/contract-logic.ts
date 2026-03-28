import { FERIADOS_NACIONAIS } from '../constants/holidays'
import { 
  startOfMonth, 
  endOfMonth, 
  differenceInMonths, 
  eachDayOfInterval
} from 'date-fns'

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

const UNIT_RATE_1X = 1920 / 20 // 96
const UNIT_RATE_2X = 2880 / 40 // 72
const UNIT_RATE_ADHOC = 90

export function calculateContractSpecs(
  startDate: Date, 
  planoId: number, 
  diasDaSemana: number[], 
  tipoContrato: string = 'semestral',
  manualEndDate?: Date
) {
  const sem = getSemesterInfo(startDate)
  const endDate = tipoContrato === 'semestral' ? sem.end : (manualEndDate || sem.end)
  
  // Count match weekdays excluding holidays
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
  const lessonDates = allDays.filter(d => 
    diasDaSemana.includes(d.getDay()) && !isHoliday(d)
  )

  const freq = planoId === 1 ? '1x' : '2x'
  const maxRegular = freq === '1x' ? sem.maxRegular1x : sem.maxRegular2x
  const fullPrice = freq === '1x' ? sem.price1x : sem.price2x
  
  let regularLessons = 0
  let bonusLessons = 0
  let totalValue = 0

  if (tipoContrato === 'semestral') {
    const unitRate = freq === '1x' ? UNIT_RATE_1X : UNIT_RATE_2X
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
    totalValue = regularLessons * UNIT_RATE_ADHOC
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

