import { TestBed } from '@angular/core/testing'
import { firstValueFrom, of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { MatchModel } from '../../model/match.model'
import { NO_COLOR } from '../../model/tag.model'
import { MatchCrudService } from '../crud/match-crud.service'
import { TeamCrudService } from '../crud/team-crud.service'
import { GeolocationService } from '../misc/geolocation.service'
import { MatchService } from './match.service'
import { MatchFormatterService } from './match-formatter.service'

describe('MatchService personal player names', () => {
  it('does not persist a private nickname as the shared solo team name', async () => {
    const save = vi.fn(() => of({ id: 1 }))
    TestBed.configureTestingModule({ providers: [
      { provide: MatchCrudService, useValue: { save } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: { currentPosition: () => of(null) } },
    ] })
    const match: MatchModel = {
      creating: true, started: false, choosenTags: [],
      game: {
        id: 1, title: 'Test', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false,
        minPlayers: 1, maxPlayers: 4, ownershipDate: null, inLibrary: false,
        matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 1,
        drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true,
        estimatedDurationInMinutes: 30,
      },
      teams: [{
        name: 'My nickname', choosenTags: [], color: NO_COLOR, score: undefined, scoreDetails: [],
        teamPlayers: [{ player: {
          id: 7, pseudo: 'My nickname', creatorPseudo: 'Canonical',
          firstName: '', lastName: '', gravatarUrl: '', preferedColor: NO_COLOR,
        } }],
      }],
    }
    const service = TestBed.inject(MatchService)
    await firstValueFrom(service.createMatch(match))
    expect(save.mock.calls[0]).toEqual([expect.objectContaining({
      teams: [expect.objectContaining({ name: 'Canonical', players: [{ playerId: 7 }] })],
    })])
    expect(match.teams[0].name).toBe('My nickname')
    match.teams[0].name = 'Custom team'
    await firstValueFrom(service.createMatch(match))
    expect(save.mock.calls[1]).toEqual([expect.objectContaining({
      teams: [expect.objectContaining({ name: 'Custom team' })],
    })])
  })

  it('uses personalized historical display names without overwriting persisted team names', async () => {
    TestBed.configureTestingModule({ providers: [
      { provide: MatchCrudService, useValue: { findOne: () => of({
        idMatch: 1, gameId: 1, teams: [{
          id: 2, name: 'Canonical', display_name: 'My nickname', creator_pseudo: 'Canonical',
        }],
      }) } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: {} },
    ] })
    const match = await firstValueFrom(TestBed.inject(MatchService).getMatch(1))
    expect(match.teams[0]).toMatchObject({
      name: 'Canonical', displayName: 'My nickname', creatorPseudo: 'Canonical',
    })
    expect(new MatchFormatterService().teamLine(match)).toBe('My nickname <small class="player-creator-pseudo">(Canonical)</small>')
    match.teams[0].displayName = '<b>Private & nickname</b>'
    expect(new MatchFormatterService().teamLine(match)).toContain('&lt;b&gt;Private &amp; nickname&lt;/b&gt;')
  })
})
