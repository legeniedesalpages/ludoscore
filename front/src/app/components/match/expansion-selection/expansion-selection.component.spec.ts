import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { Game, SelectingGame } from 'src/app/core/model/game.model'
import { MatchModel } from 'src/app/core/model/match.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { MatchService } from 'src/app/core/services/match/match.service'
import { CancelMatchCreation, SetMatchExpansions } from 'src/app/core/state/match/match.action'
import { ExpansionSelectionComponent } from './expansion-selection.component'

const base: Game = {
  id: 1, title: 'Ark Nova', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false, minPlayers: 1, maxPlayers: 4,
  ownershipDate: null, inLibrary: true, matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 42,
  drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true, estimatedDurationInMinutes: 90,
}
const expansion = (id: number, title: string, inLibrary = true, additionalPlayers = 0, played = 0, personal = 0) =>
  ({ ...base, id, title, inLibrary, additionalPlayers, isExpansion: true, baseGameBggIds: [42], playedMatchCount: played, personalPlayedMatchCount: personal }) as unknown as SelectingGame

describe('ExpansionSelectionComponent', () => {
  async function setup(options: { games?: SelectingGame[], last?: number[], hasPrevious?: boolean, chosen?: Game[] } = {}) {
    const match: MatchModel = { creating: true, started: false, teams: [], choosenTags: [], game: base, baseGame: base, expansions: options.chosen }
    const dispatch = vi.fn((_action: unknown) => of(undefined))
    TestBed.configureTestingModule({
      imports: [ExpansionSelectionComponent],
      providers: [
        provideRouter([]),
        { provide: Store, useValue: { selectSnapshot: () => match, dispatch } },
        { provide: GameService, useValue: { listAllGames: () => of(options.games ?? [
          { ...base, baseGameBggIds: [] } as unknown as SelectingGame,
          expansion(3, 'Promo', false, 2, 5, 1), expansion(2, 'Mondes Marins', true, 0, 3, 3), { ...expansion(4, 'Autre jeu'), baseGameBggIds: [7] },
        ]) } },
        { provide: MatchService, useValue: { findLastExpansions: () => of({ hasPreviousMatch: options.hasPrevious ?? true, expansionIds: options.last ?? [3] }) } },
      ],
    })
    const fixture = TestBed.createComponent(ExpansionSelectionComponent)
    await fixture.whenStable()
    fixture.detectChanges()
    return { fixture, dispatch, element: fixture.nativeElement as HTMLElement }
  }

  const actions = (dispatch: ReturnType<typeof vi.fn>) => dispatch.mock.calls.map(call => call[0])

  it('lists the expansions of the game and preselects those of the previous match', async () => {
    const { element, dispatch, fixture } = await setup()
    const rows = [...element.querySelectorAll('.result-list')]
    expect(rows.map(row => row.querySelector('.heading')?.textContent?.trim())).toEqual(['Mondes Marins', 'Promo'])
    expect(rows[0].textContent).toContain('3 parties jouées par vous')
    expect(rows[0].textContent).not.toContain('au total')
    expect(rows[1].textContent).toContain('+2 joueurs - 1 partie jouée par vous (5 au total) - Pas dans votre ludothèque')
    expect(rows.map(row => row.classList.contains('selected'))).toEqual([false, true])
    expect(element.textContent).toContain('Sélection reprise de la dernière partie')

    ;(rows[0] as HTMLElement).click()
    ;(rows[1] as HTMLElement).click()
    fixture.detectChanges()
    ;(element.querySelector('[role="footer"] button, .footer button') as HTMLButtonElement).click()

    const set = actions(dispatch).find(action => action instanceof SetMatchExpansions) as SetMatchExpansions
    expect(set.expansions.map(game => game.id)).toEqual([2])
    expect(set.hasAvailableExpansions).toBe(true)
  })

  it('keeps the current choice when coming back from player selection', async () => {
    const { element } = await setup({ games: [expansion(2, 'Mondes Marins'), expansion(3, 'Promo', true, 0, 2, 2)], chosen: [expansion(2, 'Mondes Marins')], last: [3] })
    expect([...element.querySelectorAll('.result-list.selected .heading')].map(e => e.textContent?.trim())).toEqual(['Mondes Marins'])
    expect(element.textContent).not.toContain('Sélection reprise')
    expect(element.textContent).toContain('Jamais jouée')
  })

  it('skips the screen when the game has no expansion', async () => {
    const { dispatch } = await setup({ games: [{ ...base, baseGameBggIds: [] } as unknown as SelectingGame] })
    const set = actions(dispatch).find(action => action instanceof SetMatchExpansions) as SetMatchExpansions
    expect(set.expansions).toEqual([])
    expect(set.hasAvailableExpansions).toBe(false)
  })

  it('cancels the match creation on back before any choice', async () => {
    const { fixture, dispatch } = await setup({ hasPrevious: false, last: [] })
    ;(fixture.componentInstance as unknown as { back(): void }).back()
    expect(actions(dispatch).some(action => action instanceof CancelMatchCreation)).toBe(true)
  })
})
