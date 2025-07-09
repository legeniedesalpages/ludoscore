/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 30/07/2024 - 10:25:52
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 30/07/2024
    * - Author          : renau
    * - Modification    : 
**/
import dayjs from "dayjs"


export function formatTimeDifference(date: Date): string {
    const now = dayjs()
    const inputDate = dayjs(date)

    const diffInYears = now.diff(inputDate, 'year')
    if (diffInYears >= 1) {
      return "il y a plus d'un an"
    }

    const diffInMonths = now.diff(inputDate, 'month')
    if (diffInMonths >= 1) {
      return `il y a ${diffInMonths} mois`
    }

    const diffInWeeks = now.diff(inputDate, 'week')
    if (diffInWeeks >= 1) {
      return `il y a ${diffInWeeks} semaine${diffInWeeks > 1 ? 's' : ''}`
    }

    const diffInDays = now.diff(inputDate, 'day')
    if (diffInDays > 1) {
      return `il y a ${diffInDays} jours`
    } else if (diffInDays === 1) {
      return "hier"
    }

    return "aujourd'hui"
  }