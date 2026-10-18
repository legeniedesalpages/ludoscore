import { TestBed } from '@angular/core/testing'
import { provideStore, Store } from '@ngxs/store'
import { firstValueFrom, of } from 'rxjs'
import { describe, expect, it } from 'vitest'
import { AuthService } from '../../services/auth/auth.service'
import { FindGameService } from '../../services/game/find-game.service'
import { MatchService } from '../../services/match/match.service'
import { MatchState } from '../match/match.state'
import { DoLogin, DoLogout } from './auth.actions'
import { AuthState } from './auth.state'

describe('AuthState match isolation', () => {
  it.each(['login', 'logout'])('clears the persisted match on %s without changing the server match', async operation => {
    TestBed.configureTestingModule({ providers: [
      provideStore([AuthState, MatchState]),
      { provide: AuthService, useValue: {
        login: () => of({ id: 2, email: 'next@example.test' }), logout: () => of('OK'),
      } },
      { provide: FindGameService, useValue: { resetSearch: () => {} } },
      { provide: MatchService, useValue: {} },
    ] })
    const store = TestBed.inject(Store)
    store.reset({ ...store.snapshot(),
      auth: { id: 1, email: 'previous@example.test' },
      match: { match: { matchId: 42, started: true, creating: false } },
    })
    expect(store.selectSnapshot(MatchState.match)).toBeDefined()
    await firstValueFrom(store.dispatch(operation === 'login'
      ? new DoLogin('next@example.test', 'password') : new DoLogout()))
    expect(store.selectSnapshot(MatchState.match)).toBeUndefined()
    expect(store.selectSnapshot(AuthState.userId)).toBe(operation === 'login' ? 2 : 0)
  })
})
