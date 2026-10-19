import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { describe, expect, it, vi } from 'vitest'
import { GameSearchResult } from 'src/app/core/model/game-search.model'
import { FindGameService } from 'src/app/core/services/game/find-game.service'
import { FindGameComponent } from './find-game.component'

describe('FindGameComponent library navigation', () => {
  it.each([
    { registered: true, owned: false, route: 'owned' },
    { registered: true, owned: true, route: 'owned' },
    { registered: false, owned: false, route: 'bgg' },
  ])('uses the $route editor when registered=$registered and owned=$owned', ({ registered, owned, route }) => {
    const dispatch = vi.fn()
    TestBed.configureTestingModule({ providers: [
      FindGameComponent,
      { provide: Store, useValue: { dispatch } },
      { provide: MatSnackBar, useValue: {} },
      { provide: FindGameService, useValue: {} },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
    ] })
    const result: GameSearchResult = {
      id: 42, type: 'game', name: 'Test', thumbnailUrlFromBgg: '', year: 2020, popularity: 10,
      registered, owned, matched: true,
    }
    TestBed.inject(FindGameComponent).goToGameDetail(result)
    expect(dispatch).toHaveBeenCalledWith(new Navigate(['/game-editor', route, 42]))
  })

  it('does not open the editor for an expansion', () => {
    const dispatch = vi.fn()
    const open = vi.fn()
    TestBed.configureTestingModule({ providers: [
      FindGameComponent,
      { provide: Store, useValue: { dispatch } },
      { provide: MatSnackBar, useValue: { open } },
      { provide: FindGameService, useValue: {} },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
    ] })
    TestBed.inject(FindGameComponent).goToGameDetail({
      id: 50, type: 'expansion', name: 'Extension', thumbnailUrlFromBgg: null, year: null, popularity: null,
      registered: false, owned: false, matched: false,
    })
    expect(dispatch).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalled()
  })
})

describe('FindGameService rows', () => {
  it('places expansions right below their base game', () => {
    const entry = (id: number, type: 'game' | 'expansion', expansions?: GameSearchResult[]): GameSearchResult => ({
      id, type, name: String(id), thumbnailUrlFromBgg: null, year: null, popularity: null,
      registered: false, owned: false, matched: true, expansions,
    })
    const rows = FindGameService.toRows([
      { ...entry(1, 'game', [entry(11, 'expansion'), entry(12, 'expansion')]), hiddenExpansionCount: 5 },
      entry(2, 'game', []),
    ])
    expect(rows.map(row => row.kind === 'item' ? [row.result.id, row.level] : ['hidden', row.count]))
      .toEqual([[1, 0], [11, 1], [12, 1], ['hidden', 5], [2, 0]])
  })
})
