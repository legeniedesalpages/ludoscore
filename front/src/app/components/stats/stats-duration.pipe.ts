import { Pipe, PipeTransform } from '@angular/core'

@Pipe({ name: 'statsDuration' })
export class StatsDurationPipe implements PipeTransform {
  transform(value: number | null): string {
    if (value === null) return 'Non renseigné'
    const total = Math.round(value)
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    return hours ? `${hours} h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`
  }
}
