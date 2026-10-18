import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { PlayerService } from './player.service'
import { PlayerCrudService } from '../crud/player-crud.service'

describe('PlayerService selectable participants', () => {
  it('maps match access separately from selection rights for both API permission casings', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const http = TestBed.inject(HttpTestingController)
    const result = firstValueFrom(TestBed.inject(PlayerService).listSelectablePlayers())
    http.expectOne(request => request.params.get('purpose') === 'match').flush([
      { id: 1, pseudo: 'Copied', permissions: { can_add_to_match: true, can_access_matches: false } },
      { id: 2, pseudo: 'Personal', permissions: { can_access_matches: true } },
      { id: 3, pseudo: 'Granted', permissions: { canAccessMatches: true } },
      { id: 4, pseudo: 'Unknown' },
    ])
    expect((await result).map(player => player.canAccessMatches)).toEqual([false, true, true, false])
    http.verify()
  })

  it('sends personal nicknames separately from canonical player updates and preserves creator names in models', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlayerCrudService)
    const http = TestBed.inject(HttpTestingController)
    const association = firstValueFrom(service.associateLudotag('ABCDEFGHJK23', 'My friend'))
    const joining = http.expectOne(request => request.url.endsWith('/api/player/associate-ludotag'))
    expect(joining.request.body).toEqual({ ludotag: 'ABCDEFGHJK23', personalPseudo: 'My friend' })
    joining.flush({ id: 7, pseudo: 'My friend' })
    await association
    const saving = firstValueFrom(service.savePersonalPseudo(7, null))
    const update = http.expectOne(request => request.method === 'PUT' && request.url.endsWith('/api/player/7/personal-pseudo'))
    expect(update.request.body).toEqual({ personalPseudo: null })
    update.flush({ id: 7, pseudo: 'Canonical' })
    await saving
    const players = firstValueFrom(TestBed.inject(PlayerService).listAllPlayers())
    http.expectOne(request => request.url.endsWith('/api/player')).flush([
      { id: 7, pseudo: 'My friend', creatorPseudo: 'Canonical', gravatar: '' },
    ])
    expect((await players)[0]).toMatchObject({ pseudo: 'My friend', creatorPseudo: 'Canonical' })
    http.verify()
  })

  it('previews and confirms a merge using the replaced player id and the surviving player ludotag', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlayerCrudService)
    const http = TestBed.inject(HttpTestingController)
    const preview = { replaced: { id: 2, pseudo: 'Me' }, survivor: { id: 7, pseudo: 'Other' }, matchCount: 1, participationCount: 1, conflictMatchIds: [] }
    const lookup = firstValueFrom(service.previewMerge(2, 'ABCD-EFGH-JK23'))
    const previewRequest = http.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/player/2/merge/preview'))
    expect(previewRequest.request.body).toEqual({ ludotag: 'ABCD-EFGH-JK23' })
    previewRequest.flush(preview)
    expect(await lookup).toEqual(preview)
    const result = firstValueFrom(service.merge(2, 'ABCD-EFGH-JK23'))
    const mergeRequest = http.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/player/2/merge'))
    expect(mergeRequest.request.body).toEqual({ ludotag: 'ABCD-EFGH-JK23', confirmed: true })
    mergeRequest.flush({ ...preview, mergeId: 1 })
    expect((await result).mergeId).toBe(1)
    http.verify()
  })

  it('uses a protected lookup to display the ludotag and sends its value in a POST body when associating', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    const service = TestBed.inject(PlayerCrudService)
    const http = TestBed.inject(HttpTestingController)
    const tag = firstValueFrom(service.ludotag(7))
    http.expectOne(request => request.method === 'GET' && request.url.endsWith('/api/player/7/ludotag'))
      .flush({ ludotag: 'ABCD-EFGH-JK23' })
    expect(await tag).toEqual({ ludotag: 'ABCD-EFGH-JK23' })
    const association = firstValueFrom(service.associateLudotag('abcd-efgh-jk23'))
    const request = http.expectOne(request => request.method === 'POST' && request.url.endsWith('/api/player/associate-ludotag'))
    expect(request.request.body).toEqual({ ludotag: 'abcd-efgh-jk23' })
    request.flush({ id: 7, pseudo: 'Shared' })
    expect(await association).toEqual({ id: 7, pseudo: 'Shared' })
    http.verify()
  })

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
