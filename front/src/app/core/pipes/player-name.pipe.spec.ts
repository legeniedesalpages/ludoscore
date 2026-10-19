import { describe, expect, it } from 'vitest'
import { displayPlayerName, PlayerNamePipe } from './player-name.pipe'

describe('PlayerNamePipe', () => {
  it.each([
    ['renoMc', 'RenoMc'], ['élodie', 'Élodie'], ['jean pierre', 'Jean pierre'],
    ['  reno', '  Reno'], ['RÉNO', 'RÉNO'], ['🎲reno', '🎲reno'],
    ['', ''], [null, ''], [undefined, ''],
  ])('capitalizes only the initial of %s', (value, expected) => {
    expect(new PlayerNamePipe().transform(value)).toBe(expected)
    expect(displayPlayerName(value)).toBe(expected)
  })
})
