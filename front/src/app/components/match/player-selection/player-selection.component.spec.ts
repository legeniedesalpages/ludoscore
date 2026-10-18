import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { HttpErrorResponse } from '@angular/common/http'
import { Store } from '@ngxs/store'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { Player } from 'src/app/core/model/player.model'
import { NO_COLOR } from 'src/app/core/model/tag.model'
import { GameEditorNavigationService } from 'src/app/core/services/game/game-editor-navigation.service'
import { MatchService } from 'src/app/core/services/match/match.service'
import { PlayerService } from 'src/app/core/services/player/player.service'
import { PlayerSelectionComponent } from './player-selection.component'

describe('PlayerSelectionComponent match access', () => {
  const copied: Player = {
    id: 1, pseudo: 'Copied', firstName: '', lastName: '', gravatarUrl: '',
    preferedColor: NO_COLOR, canAccessMatches: false,
  }
  const personal: Player = { ...copied, id: 2, pseudo: 'Personal', canAccessMatches: true }

  function team(player: Player): Team {
    return {
      name: player.pseudo, choosenTags: [], color: NO_COLOR, score: undefined,
      scoreDetails: [], teamPlayers: [{ player }],
    }
  }

  async function setup(players = [copied, personal], minPlayers = 1) {
    const match: MatchModel = {
      creating: true, started: false, teams: [], choosenTags: [],
      game: {
        id: 1, title: 'Test', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false,
        minPlayers, maxPlayers: 4, ownershipDate: null, inLibrary: false,
        matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 1,
        drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true,
        estimatedDurationInMinutes: 30,
      },
    }
    const matches = new BehaviorSubject(match)
    const dispatch = vi.fn(() => of(undefined))
    const open = vi.fn()
    TestBed.configureTestingModule({
      imports: [PlayerSelectionComponent],
      providers: [
        provideRouter([]),
        { provide: Store, useValue: { select: () => matches, selectSnapshot: () => matches.value, dispatch } },
        { provide: PlayerService, useValue: { listSelectablePlayers: () => of(players) } },
        { provide: MatchService, useValue: {} },
        { provide: GameEditorNavigationService, useValue: {} },
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: { open } },
      ],
    })
    TestBed.overrideProvider(MatSnackBar, { useValue: { open } })
    const fixture = TestBed.createComponent(PlayerSelectionComponent)
    await fixture.whenStable()
    async function select(selected: Player[]) {
      matches.next({ ...match, teams: selected.map(team) })
      await fixture.whenStable()
    }
    return { fixture, select, dispatch, open, element: fixture.nativeElement as HTMLElement }
  }

  it('explains the restriction before launch and does not submit a copied-only match', async () => {
    const { fixture, select, dispatch, element } = await setup()
    await select([copied])
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Ajoutez votre joueur personnel')
    const launch = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.includes('Lancer la partie'))!
    expect(launch.disabled).toBe(true)
    fixture.componentInstance.launchMatch()
    expect(dispatch).not.toHaveBeenCalled()
    await select([copied, personal])
    expect(launch.disabled).toBe(false)
    expect(element.querySelector('[role="status"]')).toBeNull()
    await select([copied])
    expect(launch.disabled).toBe(true)
  })

  it('uses fresh permissions rather than a stale participant stored in the match draft', async () => {
    const { fixture, select } = await setup()
    await select([{ ...copied, canAccessMatches: true }])
    expect(fixture.componentInstance.canContinue).toBe(false)
  })

  it('allows a copied player with extended visibility without requiring the personal player', async () => {
    const granted = { ...copied, canAccessMatches: true }
    const { fixture, select } = await setup([granted])
    await select([copied])
    expect(fixture.componentInstance.canContinue).toBe(true)
  })

  it('still enforces the game minimum and displays an API refusal if rights changed', async () => {
    const { fixture, select, dispatch, open } = await setup([copied, personal], 2)
    expect(fixture.componentInstance.canContinue).toBe(false)
    await select([personal])
    expect(fixture.componentInstance.canContinue).toBe(false)
    await select([personal, copied])
    expect(fixture.componentInstance.canContinue).toBe(true)
    dispatch.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 403, error: { message: 'Droits révoqués : rechargez les joueurs.' },
    })))
    fixture.componentInstance.launchMatch()
    expect(open).toHaveBeenCalledWith('Droits révoqués : rechargez les joueurs.', 'Fermer', { duration: 15000 })
    expect(fixture.componentInstance.saving).toBe(false)
  })
})
