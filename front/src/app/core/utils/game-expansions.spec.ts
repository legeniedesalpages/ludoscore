import { describe, expect, it } from 'vitest'
import { Game, SelectingGame } from '../model/game.model'
import { MatchModel } from '../model/match.model'
import { COLORS, NO_COLOR } from '../model/tag.model'
import { withGameRules } from '../state/match/match.state'
import { expansionCandidates, expansionTitles, mergeGameWithExpansions } from './game-expansions'

const tag = (category: string, names: string[]) => ({ category, names, unique: true, minOcurrences: 0, maxOcurrences: 1 })
const score = (category: string, max?: number) => ({ category, max, negatif: false, complex: false, color: NO_COLOR })

function game(overrides: Partial<Game>): Game {
  return {
    id: 1, title: 'Base', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false, minPlayers: 1, maxPlayers: 4,
    ownershipDate: null, inLibrary: true, matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 42,
    drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true, estimatedDurationInMinutes: 60,
    ...overrides,
  }
}

const base = game({
  matchTags: [tag('Plateau', ['A', 'B'])],
  playerTags: [tag('Faction', ['Rouge'])],
  playerColors: [COLORS[0]],
  scoreTags: [score('Attrait', 10), score('Conservation')],
})
const marine = game({
  id: 2, title: 'Mondes Marins', bggId: 50, isExpansion: true, additionalPlayers: 1,
  matchTags: [tag('Plateau', ['C']), tag('Océan', ['Oui'])],
  playerTags: [tag('Rôle', ['Mage'])],
  playerColors: [COLORS[0], COLORS[1]],
  scoreTags: [score('Récifs'), score('Attrait')],
  expansionTagChanges: [
    { baseGameBggId: 42, scope: 'match', category: 'Plateau', addedValues: ['D'], removedValues: ['A'] },
    { baseGameBggId: 99, scope: 'player', category: 'Faction', addedValues: ['Ignored'], removedValues: [] },
  ],
  expansionScoreChanges: [{ baseGameBggId: 42, category: 'Attrait', properties: { max: 20 } }],
})
const promo = game({
  id: 3, title: 'Promo', bggId: 51, isExpansion: true, additionalPlayers: 2,
  expansionTagChanges: [{ baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['Bleu'], removedValues: [] }],
})

describe('mergeGameWithExpansions', () => {
  it('returns the base game unchanged without expansions', () => {
    expect(mergeGameWithExpansions(base, [])).toBe(base)
  })

  it('applies inherited changes then adds the expansion rules', () => {
    const merged = mergeGameWithExpansions(base, [marine, promo])

    expect(merged).toMatchObject({ id: 1, title: 'Base', bggId: 42, maxPlayers: 7 })
    expect(merged.matchTags.map(t => [t.category, t.names])).toEqual([['Plateau', ['B', 'D', 'C']], ['Océan', ['Oui']]])
    expect(merged.playerTags.map(t => [t.category, t.names])).toEqual([['Faction', ['Rouge', 'Bleu']], ['Rôle', ['Mage']]])
    expect(merged.playerColors.map(c => c.name)).toEqual([COLORS[0].name, COLORS[1].name])
    expect(merged.scoreTags.map(t => [t.category, t.max])).toEqual([['Attrait', 20], ['Conservation', undefined], ['Récifs', undefined]])
    expect(base.matchTags[0].names).toEqual(['A', 'B'])
  })

  it('lists catalogue expansions of a base game with owned ones first', () => {
    const entry = (g: Game, baseGameBggIds: number[]) => ({ ...g, baseGameBggIds } as unknown as SelectingGame)
    const candidates = expansionCandidates([
      entry(base, []), entry({ ...promo, inLibrary: false }, [42]), entry({ ...marine, title: 'Zèbre' }, [42]),
      entry({ ...marine, id: 9, title: 'Ailleurs' }, [7]),
    ], base)
    expect(candidates.map(c => c.id)).toEqual([2, 3])
    expect(expansionTitles(candidates)).toBe('Zèbre, Promo')
  })

  it('keeps only the choices still valid with new game rules', () => {
    const match: MatchModel = {
      creating: true, started: false, game: mergeGameWithExpansions(base, [marine]), baseGame: base, expansions: [marine],
      choosenTags: [{ category: 'Plateau', names: ['C'] }, { category: 'Océan', names: ['Oui'] }],
      teams: [{
        name: 'A', color: COLORS[1], score: 5, teamPlayers: [],
        choosenTags: [{ category: 'Rôle', names: ['Mage'] }, { category: 'Faction', names: ['Rouge'] }],
        scoreDetails: [{ categoryName: 'Récifs', value: 3, inputString: '3' }, { categoryName: 'Attrait', value: 2, inputString: '2' }],
      }],
    }
    const updated = withGameRules(match, base, [])

    expect(updated.game).toBe(base)
    expect(updated.expansions).toEqual([])
    expect(updated.choosenTags).toEqual([])
    expect(updated.teams[0].choosenTags).toEqual([{ category: 'Faction', names: ['Rouge'] }])
    expect(updated.teams[0].scoreDetails.map(s => s.categoryName)).toEqual(['Attrait'])
    expect(updated.teams[0].score).toBe(2)
  })
})
