import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { GameService } from './game.service'
import { GameToSave } from '../../model/game.model'

describe('GameService personal library', () => {
  it('preserves personal and global play counts separately when listing games', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const result = firstValueFrom(TestBed.inject(GameService).listAllGames())
    const http = TestBed.inject(HttpTestingController)
    http.expectOne(request => request.url.endsWith('/api/game')).flush([
      { id: 1, title: 'Test', inLibrary: false, playedMatchCount: 12, personalPlayedMatchCount: 0, libraryUserCount: 3, baseGameBggIds: [42, 60] },
    ])
    const games = await result
    expect(games[0].personalPlayedMatchCount).toBe(0)
    expect(games[0].playedMatchCount).toBe(12)
    expect(games[0].libraryUserCount).toBe(3)
    expect(games[0].baseGameBggIds).toEqual([42, 60])
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

  it.each([undefined, 0, false, 1, true])('maps isExpansion=%s independently of ownership', async isExpansion => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const result = firstValueFrom(TestBed.inject(GameService).getFromBgg(50))
    const http = TestBed.inject(HttpTestingController)
    http.expectOne(request => request.url.endsWith('/api/game/bgg/50')).flush({
      id: 1, title: 'Expansion', isExpansion, inLibrary: true,
    })
    expect((await result).isExpansion).toBe(isExpansion === 1 || isExpansion === true)
    http.verify()
  })

  it('maps additional players and read-only parent color groups', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const result = firstValueFrom(TestBed.inject(GameService).getFromBgg(50))
    const http = TestBed.inject(HttpTestingController)
    const baseGameColors = [{ bggId: 42, title: 'Base', playerColors: [] }]
    const baseGameTags = [{ bggId: 42, title: 'Base', playerTags: [], matchTags: [] }]
    const expansionTagChanges = [{ baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'] }]
    http.expectOne(request => request.url.endsWith('/api/game/bgg/50')).flush({
      id: 1, isExpansion: true, additionalPlayers: 2, baseGameColors, baseGameTags, expansionTagChanges,
    })
    expect(await result).toEqual(expect.objectContaining({ additionalPlayers: 2, baseGameColors, baseGameTags, expansionTagChanges }))
    http.verify()
  })

  it.each([true, false])('sends the correct properties for isExpansion=%s', async isExpansion => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const game: GameToSave = {
      bggId: 50, title: 'Test', isExpansion, additionalPlayers: 2,
      minPlayers: 1, maxPlayers: 4, isOnlyCooperative: false, estimatedDurationInMinutes: 60,
      quantifiableScore: true, highestScoreWin: true, drawAllowed: true, drawBreaker: [],
      matchTags: [], playerTags: [], playerColors: [], scoreTags: [],
      inLibrary: true, ownershipDate: null,
      expansionTagChanges: [{ baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'] }],
    }
    const result = firstValueFrom(TestBed.inject(GameService).save(game))
    const http = TestBed.inject(HttpTestingController)
    const request = http.expectOne(request => request.method === 'POST')
    for (const name of ['minPlayers', 'maxPlayers', 'isOnlyCooperative', 'estimatedDurationInMinutes', 'quantifiableScore', 'highestScoreWin']) {
      expect(Object.hasOwn(request.request.body, name)).toBe(!isExpansion)
    }
    expect(Object.hasOwn(request.request.body, 'additionalPlayers')).toBe(isExpansion)
    if (isExpansion) expect(request.request.body.additionalPlayers).toBe(2)
    expect(Object.hasOwn(request.request.body, 'expansionTagChanges')).toBe(isExpansion)
    if (isExpansion) expect(request.request.body.expansionTagChanges).toEqual(game.expansionTagChanges)
    request.flush({ id: 1 })
    http.expectOne(request => request.url.endsWith('/api/game/bgg/50')).flush({ id: 1 })
    await result
    http.verify()
  })

  it('parses tag changes in raw catalogue JSON as well as model detail arrays', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const changes = [{ baseGameBggId: 42, scope: 'match', category: 'Map', addedValues: ['C'], removedValues: [] }]
    const result = firstValueFrom(TestBed.inject(GameService).listAllGames())
    const http = TestBed.inject(HttpTestingController)
    http.expectOne(request => request.url.endsWith('/api/game')).flush([
      { id: 1, expansionTagChanges: JSON.stringify(changes) }, { id: 2, expansionTagChanges: null },
    ])
    expect((await result).map(game => game.expansionTagChanges)).toEqual([changes, []])
    http.verify()
  })
})
