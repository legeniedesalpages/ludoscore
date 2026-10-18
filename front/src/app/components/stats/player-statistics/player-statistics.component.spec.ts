import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { PlayerStatisticsDirectory } from 'src/app/core/model/player-statistics.model'
import { PlayerStatisticsComponent } from './player-statistics.component'

describe('PlayerStatisticsComponent', () => {
  const summary = {
    matches: 3, totalPlayMinutes: 120, averageDurationMinutes: 40,
    minDurationMinutes: 20, maxDurationMinutes: 60, measuredMatches: 3,
  }
  const directory: PlayerStatisticsDirectory = {
    summary: { ...summary, totalPlayers: 2, activePlayers: 1 },
    data: [
      { ...summary, id: 1, name: 'Alice', creatorPseudo: 'Canonical', createdAt: '2026-01-01', wins: 1, decidedMatches: 2, winRate: 50, gamesPlayed: 2 },
      { ...summary, id: 2, name: 'Bob', createdAt: '2026-01-02', matches: 0, wins: 0, decidedMatches: 0, winRate: null, gamesPlayed: 0 },
    ],
  }

  it('renders the summary, prompt and player links in order including inactive players', async () => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: StatisticsApiService, useValue: { playerDirectory: () => of(directory) } },
    ] })
    const fixture = TestBed.createComponent(PlayerStatisticsComponent)
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    expect(element.querySelector('.summary')?.textContent).toContain('2 h 00')
    const blocks = Array.from(element.querySelectorAll('.summary, app-stats-question, [aria-label="Joueurs classés par nombre de parties"]'))
    expect(blocks.map(node => node.tagName)).toEqual(['DL', 'APP-STATS-QUESTION', 'DIV'])
    const links = element.querySelectorAll('.result-list')
    expect(links.length).toBe(2)
    expect(links[0].getAttribute('href')).toBe('/statistics/players/1')
    expect(links[0].textContent).toContain('50 % de victoires')
    expect(links[0].querySelector('small.player-creator-pseudo')?.textContent).toBe('(Canonical)')
    expect(links[1].textContent).toContain('Taux non déterminé')
  })

  it('shows errors and can reload an empty directory', async () => {
    const playerDirectory = vi.fn()
      .mockReturnValueOnce(throwError(() => new Error('Network')))
      .mockReturnValueOnce(of({ ...directory, data: [] }))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: StatisticsApiService, useValue: { playerDirectory } },
    ] })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fixture = TestBed.createComponent(PlayerStatisticsComponent)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Impossible')
    fixture.componentInstance.load()
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('Aucun joueur enregistré')
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull()
    consoleError.mockRestore()
  })
})
