import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { GameService } from './game.service'

describe('GameService personal library', () => {
  it('preserves personal and global play counts separately when listing games', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const result = firstValueFrom(TestBed.inject(GameService).listAllGames())
    const http = TestBed.inject(HttpTestingController)
    http.expectOne(request => request.url.endsWith('/api/game')).flush([
      { id: 1, title: 'Test', inLibrary: false, playedMatchCount: 12, personalPlayedMatchCount: 0, libraryUserCount: 3 },
    ])
    const games = await result
    expect(games[0].personalPlayedMatchCount).toBe(0)
    expect(games[0].playedMatchCount).toBe(12)
    expect(games[0].libraryUserCount).toBe(3)
    http.verify()
  })

  it.each([undefined, null, 0, false, 1, true])('maps inLibrary=%s without assuming ownership', async inLibrary => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const result = firstValueFrom(TestBed.inject(GameService).getFromBgg(42))
    const http = TestBed.inject(HttpTestingController)
    http.expectOne(request => request.url.endsWith('/api/game/bgg/42')).flush({
      id: 1, title: 'Test', inLibrary, ownershipDate: null,
    })
    expect((await result).inLibrary).toBe(inLibrary === 1 || inLibrary === true)
    http.verify()
  })
})
