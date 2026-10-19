import { Pipe, PipeTransform } from '@angular/core'

export function displayPlayerName(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/^(\s*)(\S)/u, (_, space: string, first: string) => space + first.toLocaleUpperCase('fr'))
}

@Pipe({ name: 'playerName' })
export class PlayerNamePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return displayPlayerName(value)
  }
}
