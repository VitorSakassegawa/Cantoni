import { FERIADOS_NACIONAIS } from '../constants/holidays'
import { 
  startOfMonth, 
  endOfMonth, 
  differenceInMonths, 
  addMonths, 
  eachDayOfInterval, 
  isSameDay,
  isBefore,
  addDays,
  parseISO
} from 'date-fns'

export const SEMESTERS = {
  1: { startMonth: 0, endMonth: 6, label: 'jan-jul', totalMonths: 7, maxRegular1x: 20, maxRegular2x: 40, price1x: 1920, price2x: 2880 },
  2: { startMonth: 7, endMonth: 11, label: 'aug-dez', totalMonths: 5, maxRegular1x: 20, maxRegular2x: 40, price1x: 1920, price2x: 2880 }
}

export function isHoliday(date: Date) {
  const dateStr = date.toISOString().split('T')[0]
  return FERIADOS_NACIONAIS.includes(dateStr)
}

export function getSemesterInfo(date: Date) {
  const month = date.getMonth()
  const year = date.getFullYear()
  
  if (month <= 6) { // Jan-Jul
    return {
      num: 1,
      ...SEMESTERS[1],
      start: new Date(year, 0, 1),
      end: new Date(year, 6, 31)
    }
  } else { // Aug-Dec
    return {
      num: 2,
      ...SEMESTERS[2],
      start: new Date(year, 7, 1),
      end: new Date(year, 11, 31)
    }
  }
}

export function calculateContractSpecs(startDate: Date, planoId: number, diasDaSemana: number[]) {
  const sem = getSemesterInfo(startDate)
  const endDate = sem.end
  
  // Count match weekdays excluding holidays
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
  const lessonDates = allDays.filter(d => 
    diasDaSemana.includes(d.getDay()) && !isHoliday(d)
  )

  const freq = planoId === 1 ? '1x' : '2x'
  const maxRegular = freq === '1x' ? sem.maxRegular1x : sem.maxRegular2x
  const totalValue = freq === '1x' ? sem.price1x : sem.price2x
  
  // Partial Months Calculation
  // We count the months from startDate to endDate inclusive of the starting month
  const startMonth = startOfMonth(startDate)
  const endMonthDate = endOfMonth(endDate)
  const remainingMonths = differenceInMonths(endMonthDate, startMonth) + 1
  
  // Value per month = Total Semester Value / Semester Total Months
  const valuePerMonth = totalValue / sem.totalMonths
  const partialValue = valuePerMonth * remainingMonths

  // Proportional Regular Lessons
  const proportionalRegularMax = Math.ceil((maxRegular / sem.totalMonths) * remainingMonths)

  return {
    semesterLabel: sem.label,
    endDate,
    totalLessons: lessonDates.length,
    regularLessons: Math.min(lessonDates.length, proportionalRegularMax),
    bonusLessons: Math.max(0, lessonDates.length - proportionalRegularMax),
    totalValue: Math.round(partialValue * 100) / 100,
    remainingMonths,
    lessonDates
  }
}
