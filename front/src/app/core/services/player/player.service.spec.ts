import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { PlayerService } from './player.service'

describe('PlayerService selectable participants', () => {
  it('always reloads the permitted participants rather than reusing a general player list', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlayerService)
    const http = TestBed.inject(HttpTestingController)
    const all = firstValueFrom(service.listAllPlayers())
    http.expectOne(request => request.url.endsWith('/api/player')).flush([
      { id: 1, pseudo: 'Read only', gravatar: '' },
      { id: 2, pseudo: 'Selectable', gravatar: '' },
    ])
    expect(await all).toHaveLength(2)
    for (const id of [2, 3]) {
      const selectable = firstValueFrom(service.listSelectablePlayers())
      http.expectOne(request => request.url.endsWith('/api/player') && request.params.get('purpose') === 'match')
        .flush([{ id, pseudo: 'Permitted', gravatar: '' }])
      expect((await selectable).map(player => player.id)).toEqual([id])
    }
    http.verify()
  })
})
