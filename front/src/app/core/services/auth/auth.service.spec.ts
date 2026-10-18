import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it } from 'vitest'
import { PlayerService } from '../player/player.service'
import { AuthService } from './auth.service'

describe('AuthService player cache isolation', () => {
  let http: HttpTestingController
  let players: PlayerService
  let auth: AuthService

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })
    http = TestBed.inject(HttpTestingController)
    players = TestBed.inject(PlayerService)
    auth = TestBed.inject(AuthService)
  })

  async function cachePreviousPlayers(): Promise<void> {
    const result = firstValueFrom(players.listAllPlayers())
    http.expectOne(request => request.url.endsWith('/api/player')).flush([
      { id: 1, pseudo: 'Previous account', gravatar: 'previous' },
    ])
    expect((await result).map(player => player.id)).toEqual([1])
    expect((await firstValueFrom(players.listAllPlayers())).map(player => player.id)).toEqual([1])
    http.expectNone(request => request.url.endsWith('/api/player'))
  }

  async function expectFreshPlayers(): Promise<void> {
    const result = firstValueFrom(players.listAllPlayers())
    http.expectOne(request => request.url.endsWith('/api/player')).flush([
      { id: 2, pseudo: 'Current account', gravatar: 'current' },
    ])
    expect((await result).map(player => player.id)).toEqual([2])
    http.verify()
  }

  it('reloads participants after signing in with another account', async () => {
    await cachePreviousPlayers()
    const login = firstValueFrom(auth.login('current@example.test', 'password'))
    http.expectOne(request => request.url.endsWith('/sanctum/csrf-cookie')).flush(null)
    http.expectOne(request => request.url.endsWith('/api/auth/login')).flush(2)
    http.expectOne(request => request.url.endsWith('/api/user/2')).flush({
      id: 2, email: 'current@example.test', isAdmin: false,
    })
    await login
    await expectFreshPlayers()
  })

  it('discards cached participants after signing out', async () => {
    await cachePreviousPlayers()
    const logout = firstValueFrom(auth.logout())
    http.expectOne(request => request.url.endsWith('/api/auth/logout')).flush('OK')
    await logout
    await expectFreshPlayers()
  })
})
