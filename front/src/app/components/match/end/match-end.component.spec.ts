import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, provideRouter } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { provideStore, Store } from '@ngxs/store'
import { firstValueFrom, of, Subject } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { MatchEntity } from 'src/app/core/entity/match-entity.model'
import { MatchModel } from 'src/app/core/model/match.model'
import { NO_COLOR } from 'src/app/core/model/tag.model'
import { MatchService } from 'src/app/core/services/match/match.service'
import { MatchState } from 'src/app/core/state/match/match.state'
import { MatchEndComponent } from './match-end.component'
import { StoryDialogComponent } from '../story-dialog/story-dialog.component'

describe('MatchEndComponent story navigation', () => {
  function setup() {
    const saved = new Subject<MatchEntity>()
    const open = vi.fn()
    const match: MatchModel = {
      matchId: 42, creating: false, started: false, choosenTags: [],
      game: {
        id: 1, title: 'Test', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false,
        minPlayers: 1, maxPlayers: 4, ownershipDate: null, inLibrary: false,
        matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 1,
        drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true,
        estimatedDurationInMinutes: 30,
      },
      teams: [{
        id: 2, name: 'Alice', choosenTags: [], color: NO_COLOR, score: 100,
        scoreDetails: [], teamPlayers: [],
      }],
    }
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideStore([MatchState]),
      { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
      { provide: MatchService, useValue: { saveMatchResult: () => saved.asObservable() } },
      { provide: MatSnackBar, useValue: { open: vi.fn(() => ({ onAction: () => of() })) } },
      { provide: MatDialog, useValue: { open } },
    ] })
    const store = TestBed.inject(Store)
    store.reset({ ...store.snapshot(), match: { match } })
    const dispatch = vi.spyOn(store, 'dispatch')
    const fixture = TestBed.createComponent(MatchEndComponent)
    return { fixture, store, dispatch, saved, open }
  }

  it('returns home and opens the story popup only after successful score saving', async () => {
    const { fixture, store, dispatch, saved, open } = setup()
    await fixture.whenStable()
    fixture.componentInstance.endMatch()
    const finished = firstValueFrom(dispatch.mock.results[0].value)
    expect(dispatch.mock.calls.some(([action]) => action instanceof Navigate)).toBe(false)
    expect(open).not.toHaveBeenCalled()
    saved.next({ id: 42, gameId: 1, canceled: false, running: false, tags: '[]' })
    saved.complete()
    await finished
    await fixture.whenStable()
    expect(store.selectSnapshot(MatchState.match)).toBeUndefined()
    expect(dispatch).toHaveBeenCalledWith(new Navigate(['/']))
    expect(open).toHaveBeenCalledExactlyOnceWith(StoryDialogComponent, expect.objectContaining({
      data: { matchId: 42 }, disableClose: true, restoreFocus: false
    }))
    expect(fixture.componentInstance.saving).toBe(false)
  })

  it('keeps the scores available and does not open the story when saving fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { fixture, store, dispatch, saved, open } = setup()
    await fixture.whenStable()
    fixture.componentInstance.endMatch()
    const finished = firstValueFrom(dispatch.mock.results[0].value).catch(() => undefined)
    saved.error(new Error('Save failed'))
    await finished
    await fixture.whenStable()
    expect(store.selectSnapshot(MatchState.match).matchId).toBe(42)
    expect(dispatch.mock.calls.some(([action]) => action instanceof Navigate)).toBe(false)
    expect(open).not.toHaveBeenCalled()
    expect(fixture.componentInstance.saving).toBe(false)
    consoleError.mockRestore()
    consoleWarn.mockRestore()
  })
})
