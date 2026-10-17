import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { StatisticsService } from 'src/app/core/services/stats/statistics.service'
import { StatisticsComponent } from './statistics.component'

@Component({ template: '' })
class Destination {}

describe('StatisticsComponent navigation', () => {
  it.each([
    ['jeux', '/statistics/games'],
    ['joueurs', '/statistics/players'],
  ])('opens the statistics page for %s from its card', async (label, url) => {
    TestBed.configureTestingModule({ providers: [
      provideRouter([{ path: url.slice(1), component: Destination }]),
      { provide: Store, useValue: { dispatch: vi.fn() } },
      { provide: StatisticsService, useValue: { loadDashboard: () => of({
        dashboard: { totalMatches: 0, totalGames: 0, totalPlayers: 0, mostPlayedGameCount: 0, bestPlayerWins: 0 },
        error: null, loading: false,
      }) } },
    ] })
    const fixture = TestBed.createComponent(StatisticsComponent)
    await fixture.whenStable()
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(`[aria-label="Voir plus de stats par ${label}"]`)
    expect(link.getAttribute('href')).toBe(url)
    link.click()
    await fixture.whenStable()
    expect(TestBed.inject(Router).url).toBe(url)
  })
})
