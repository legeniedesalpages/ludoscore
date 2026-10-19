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
        idMatch: 1, gameId: 1, story: 'Une histoire conservee.', teams: [{
          id: 2, name: 'canonicalCase', display_name: 'my nickname', creator_pseudo: 'canonicalCase',
        }],
      }) } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: {} },
    ] })
    const match = await firstValueFrom(TestBed.inject(MatchService).getMatch(1))
    expect(match.story).toBe('Une histoire conservee.')
    expect(match.teams[0]).toMatchObject({
      name: 'canonicalCase', displayName: 'my nickname', creatorPseudo: 'canonicalCase',
    })
    expect(new MatchFormatterService().teamLine(match)).toBe('My nickname <small class="player-creator-pseudo">(CanonicalCase)</small>')
    expect(match.teams[0].name).toBe('canonicalCase')
    expect(match.teams[0].displayName).toBe('my nickname')
    match.teams[0].displayName = '<b>Private & nickname</b>'
    expect(new MatchFormatterService().teamLine(match)).toContain('&lt;b&gt;Private &amp; nickname&lt;/b&gt;')
  })

  it('returns the generated story from the API', async () => {
    const generateStory = vi.fn(() => of({ story: 'Un final serre.' }))
    TestBed.configureTestingModule({ providers: [
      { provide: MatchCrudService, useValue: { generateStory } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: {} },
    ] })
    expect(await firstValueFrom(TestBed.inject(MatchService).generateMatchStory(7))).toBe('Un final serre.')
    expect(generateStory).toHaveBeenCalledExactlyOnceWith(7)
  })

  it('sends the base game and selected expansions when a match starts', async () => {
    const save = vi.fn(() => of({ id: 1 }))
    TestBed.configureTestingModule({ providers: [
      { provide: MatchCrudService, useValue: { save } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: { currentPosition: () => of(null) } },
    ] })
    const base = {
      id: 1, title: 'Base', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false,
      minPlayers: 1, maxPlayers: 4, ownershipDate: null, inLibrary: true,
      matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 42,
      drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true,
      estimatedDurationInMinutes: 30,
    }
    const match: MatchModel = {
      creating: true, started: false, choosenTags: [], teams: [],
      game: { ...base, id: 99 }, baseGame: base, expansions: [{ ...base, id: 5 }, { ...base, id: 6 }],
    }
    await firstValueFrom(TestBed.inject(MatchService).createMatch(match))
    expect(save.mock.calls[0]).toEqual([expect.objectContaining({
      match: expect.objectContaining({ gameId: 1, expansionIds: [5, 6] }),
    })])
  })

  it('rebuilds the match rules from the expansions of the history detail', async () => {
    TestBed.configureTestingModule({ providers: [
      { provide: MatchCrudService, useValue: { findOne: () => of({
        idMatch: 1, gameId: 1, title: 'Base', bggId: 42, maxPlayers: 4,
        playerTags: JSON.stringify([{ category: 'Faction', names: ['Rouge'], unique: true, minOcurrences: 0, maxOcurrences: 1 }]),
        scoreTemplate: JSON.stringify([{ category: 'Attrait', max: 10, negatif: false, complex: false }]),
        teams: [],
        expansions: [{
          id: 2, title: 'Mondes Marins', bggId: 50, thumbnailId: 't.jpg', imageId: 'i.jpg', additionalPlayers: 1,
          matchTags: [], playerTags: [], playerColors: [],
          scoreTags: [{ category: 'Récifs', negatif: false, complex: false }],
          expansionTagChanges: [{ baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['Bleu'], removedValues: [] }],
          expansionScoreChanges: [{ baseGameBggId: 42, category: 'Attrait', properties: { max: 20 } }],
        }],
      }) } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: {} },
    ] })
    const match = await firstValueFrom(TestBed.inject(MatchService).getMatch(1))
    expect(match.baseGame?.maxPlayers).toBe(4)
    expect(match.expansions?.map(expansion => expansion.title)).toEqual(['Mondes Marins'])
    expect(match.expansions?.[0].thumbnailUrl).toContain('t.jpg')
    expect(match.game.maxPlayers).toBe(5)
    expect(match.game.playerTags[0].names).toEqual(['Rouge', 'Bleu'])
    expect(match.game.scoreTags.map(tag => [tag.category, tag.max])).toEqual([['Attrait', 20], ['Récifs', undefined]])
  })

  it('treats a summary without expansions as a match without expansions', async () => {
    TestBed.configureTestingModule({ providers: [
      { provide: MatchCrudService, useValue: { findOne: () => of({ idMatch: 1, gameId: 1, teams: [] }) } },
      { provide: TeamCrudService, useValue: {} },
      { provide: GeolocationService, useValue: {} },
    ] })
    const match = await firstValueFrom(TestBed.inject(MatchService).getMatch(1))
    expect(match.expansions).toEqual([])
    expect(match.game).toBe(match.baseGame)
  })
})
