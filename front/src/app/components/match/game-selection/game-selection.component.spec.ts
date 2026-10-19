import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, Router } from '@angular/router'
import { Store } from '@ngxs/store'
import { describe, expect, it, vi } from 'vitest'
import { SelectingGame } from 'src/app/core/model/game.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { GameSelectionComponent } from './game-selection.component'

describe('GameSelectionComponent expansions', () => {
  function setup() {
    const dispatch = vi.fn()
    const open = vi.fn()
    TestBed.configureTestingModule({ providers: [
      GameSelectionComponent,
      { provide: GameService, useValue: {} },
      { provide: Store, useValue: { dispatch } },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      { provide: ActivatedRoute, useValue: {} },
      { provide: Router, useValue: {} },
      { provide: MatSnackBar, useValue: { open } },
    ] })
    const base: SelectingGame = {
      id: 1, bggId: 42, title: 'Base', imageUrl: '', thumbnailUrl: '', isExpansion: false,
      isOnlyCooperative: false, minPlayers: 1, maxPlayers: 4, inLibrary: true, ownershipDate: null,
      estimatedDurationInMinutes: 30, drawAllowed: true, drawBreaker: [],
      quantifiableScore: true, highestScoreWin: true, matchTags: [], playerTags: [], playerColors: [], scoreTags: [],
      lastPlayed: new Date(), lastWinner: '', createdAt: '2020-01-01',
      playedMatchCount: 1, personalPlayedMatchCount: 1, libraryUserCount: 1,
    }
    return { component: TestBed.inject(GameSelectionComponent), base, dispatch, open }
  }

  it('never lists expansions even when showing the entire catalogue', () => {
    const { component, base } = setup()
    component.onlyInLibraryFilter = false
    expect(component.filterGames([base, { ...base, id: 2, isExpansion: true }])).toEqual([base])
  })

  it('refuses direct selection of an expansion', () => {
    const { component, base, dispatch, open } = setup()
    component.gameSelection({ ...base, isExpansion: true })
    expect(dispatch).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalled()
  })
})
