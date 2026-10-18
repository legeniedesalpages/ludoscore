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
      id: 42, name: 'Test', thumbnailUrlFromBgg: '', year: 2020, popularity: 10,
      registered, owned,
    }
    TestBed.inject(FindGameComponent).goToGameDetail(result)
    expect(dispatch).toHaveBeenCalledWith(new Navigate(['/game-editor', route, 42]))
  })
})
