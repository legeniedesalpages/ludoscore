import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { GameStatisticsComponent } from './game-statistics.component'

describe('GameStatisticsComponent', () => {
  const summary = {
    matches: 3, totalPlayMinutes: 119.9, averageDurationMinutes: 40,
    minDurationMinutes: 20, maxDurationMinutes: 60, measuredMatches: 3,
  }

  it('renders the summary, prompt, and history-style links in order', async () => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: StatisticsApiService, useValue: { gameLibrary: () => of({
        summary: { ...summary, totalGames: 2, playedGames: 1 },
        data: [
          { ...summary, id: 1, title: 'Jeu joué', thumbnailId: null, createdAt: '2026-01-01' },
          { ...summary, id: 2, title: 'Jeu jamais joué', matches: 0, thumbnailId: null, createdAt: '2026-01-02' },
        ],
      }) } },
    ] })
    const fixture = TestBed.createComponent(GameStatisticsComponent)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.querySelector('.summary')?.textContent).toContain('2 h 00')
    const blocks = Array.from(element.querySelectorAll('.summary, app-stats-question, .game-list')).map(node => node.tagName)
    expect(blocks).toEqual(['DL', 'APP-STATS-QUESTION', 'DIV'])
    expect(element.querySelectorAll('.result-list').length).toBe(2)
    expect(element.querySelector('.result-list')?.getAttribute('href')).toBe('/statistics/games/1')
    expect(element.querySelectorAll('.result-list')[1].textContent).toContain('0 partie')
  })

  it('shows errors and can reload successfully with an empty library', async () => {
    const gameLibrary = vi.fn()
      .mockReturnValueOnce(throwError(() => new Error('Network')))
      .mockReturnValueOnce(of({ summary: { ...summary, totalGames: 0, playedGames: 0 }, data: [] }))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: StatisticsApiService, useValue: { gameLibrary } },
    ] })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fixture = TestBed.createComponent(GameStatisticsComponent)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Impossible')
    fixture.componentInstance.load()
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('Aucun jeu enregistré')
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull()
    consoleError.mockRestore()
  })
})
