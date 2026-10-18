import { TestBed } from '@angular/core/testing'
import { registerLocaleData } from '@angular/common'
import localeFr from '@angular/common/locales/fr'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { of, Subject, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { MatchModel } from 'src/app/core/model/match.model'
import { NO_COLOR } from 'src/app/core/model/tag.model'
import { MatchService } from 'src/app/core/services/match/match.service'
import { MatchHistoryDetailComponent } from './match-history-detail.component'

registerLocaleData(localeFr)

describe('MatchHistoryDetailComponent story', () => {
  function match(overrides: Partial<MatchModel> = {}): MatchModel {
    return {
      matchId: 7, creating: false, started: true, running: false, canceled: false,
      startedAt: new Date('2026-10-18T20:00:00'), endedAt: new Date('2026-10-18T21:00:00'),
      choosenTags: [], story: null,
      game: {
        id: 1, title: 'Test', imageUrl: '', thumbnailUrl: '', isOnlyCooperative: false,
        minPlayers: 1, maxPlayers: 4, ownershipDate: null, inLibrary: false,
        matchTags: [], playerTags: [], playerColors: [], scoreTags: [], bggId: 1,
        drawAllowed: false, drawBreaker: [], quantifiableScore: true, highestScoreWin: true,
        estimatedDurationInMinutes: 30,
      },
      teams: [{
        id: 2, name: 'Alice', choosenTags: [], color: NO_COLOR, score: 100,
        scoreDetails: [], teamPlayers: [],
      }],
      ...overrides,
    }
  }

  function setup(value: MatchModel, auto = false, generateMatchStory = vi.fn(() => of('Une victoire eclatante.'))) {
    const getMatch = vi.fn(() => of(value))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: {
        paramMap: of(convertToParamMap({ id: '7' })),
        snapshot: { queryParamMap: convertToParamMap(auto ? { generateStory: 'true' } : {}) },
      } },
      { provide: Store, useValue: { dispatch: vi.fn() } },
      { provide: MatchService, useValue: { getMatch, getMatchPhoto: () => of(null), generateMatchStory } },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      { provide: MatDialog, useValue: { open: vi.fn() } },
    ] })
    const fixture = TestBed.createComponent(MatchHistoryDetailComponent)
    return { fixture, generateMatchStory }
  }

  it('displays the saved story as plain text without generating it again', async () => {
    const { fixture, generateMatchStory } = setup(match({ story: '<b>Une victoire</b>\nUn final serre.' }), true)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('.story-text').textContent).toContain('<b>Une victoire</b>')
    expect(fixture.nativeElement.querySelector('.story-text b')).toBeNull()
    expect(fixture.nativeElement.querySelector('.match-story').textContent).not.toMatch(/\bIA\b|intelligence artificielle|Gemini/)
    expect(generateMatchStory).not.toHaveBeenCalled()
  })

  it('offers a button for old games and displays the generated story', async () => {
    const { fixture, generateMatchStory } = setup(match())
    await fixture.whenStable()
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.match-story button')
    expect(button.textContent).toContain('Générer le récit')
    expect(generateMatchStory).not.toHaveBeenCalled()
    button.click()
    await fixture.whenStable()
    expect(generateMatchStory).toHaveBeenCalledExactlyOnceWith(7)
    expect(fixture.nativeElement.querySelector('.story-text').textContent).toBe('Une victoire eclatante.')
    expect(fixture.nativeElement.querySelector('.match-story button')).toBeNull()
  })

  it('does not automatically generate stories from the former end-of-match query parameter', async () => {
    const { fixture, generateMatchStory } = setup(match(), true)
    await fixture.whenStable()
    expect(generateMatchStory).not.toHaveBeenCalled()
    expect(fixture.nativeElement.querySelector('.match-story button')).not.toBeNull()
  })

  it('shows pending state and prevents duplicate generation and edits', async () => {
    const pending = new Subject<string>()
    const { fixture, generateMatchStory } = setup(match(), true, vi.fn(() => pending.asObservable()))
    await fixture.whenStable()
    fixture.componentInstance.generateStory()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=status]').textContent).toContain('Le récit de votre partie prend forme')
    expect(fixture.nativeElement.querySelector('.match-story').getAttribute('aria-busy')).toBe('true')
    expect(fixture.nativeElement.querySelector('.validate-button').disabled).toBe(true)
    fixture.componentInstance.generateStory()
    expect(generateMatchStory).toHaveBeenCalledTimes(1)
    pending.next('Un beau final.')
    pending.complete()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('.story-text').textContent).toBe('Un beau final.')
    expect(fixture.nativeElement.querySelector('.validate-button').disabled).toBe(false)
  })

  it('keeps the results visible on failure and lets the user retry', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const generate = vi.fn()
      .mockReturnValueOnce(throwError(() => new Error('Gemini unavailable')))
      .mockReturnValueOnce(of('Le recit est disponible.'))
    const { fixture } = setup(match(), true, generate)
    await fixture.whenStable()
    fixture.componentInstance.generateStory()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Les scores sont enregistrés')
    expect(fixture.componentInstance.matchModel()?.teams[0].score).toBe(100)
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.match-story button')
    expect(button.textContent).toContain('Réessayer')
    button.click()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull()
    expect(fixture.nativeElement.querySelector('.story-text').textContent).toBe('Le recit est disponible.')
    consoleError.mockRestore()
  })

  it.each([{ running: true }, { canceled: true }])('does not offer stories for unfinished games: %j', async overrides => {
    const { fixture, generateMatchStory } = setup(match(overrides), true)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('.match-story')).toBeNull()
    expect(generateMatchStory).not.toHaveBeenCalled()
  })
})
