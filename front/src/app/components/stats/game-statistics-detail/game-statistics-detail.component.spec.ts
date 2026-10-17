import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { GameStatisticsDetail } from 'src/app/core/model/game-statistics.model'
import { GameStatisticsDetailComponent } from './game-statistics-detail.component'

describe('GameStatisticsDetailComponent', () => {
  const detail: GameStatisticsDetail = {
    id: 7, title: 'Premier jeu', matches: 0, totalPlayMinutes: 0,
    averageDurationMinutes: null, minDurationMinutes: null, maxDurationMinutes: null,
    measuredMatches: 0, averageWaitDays: null, charts: [],
  }

  it('loads each route parameter and displays unplayed games without misleading averages', async () => {
    const params = new BehaviorSubject(convertToParamMap({ id: '7' }))
    const gameDetail = vi.fn().mockReturnValueOnce(of(detail)).mockReturnValueOnce(of({ ...detail, id: 8, title: 'Second jeu' }))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: StatisticsApiService, useValue: { gameDetail } },
    ] })
    const fixture = TestBed.createComponent(GameStatisticsDetailComponent)
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('Ce jeu n’a pas encore de partie terminée')
    expect(fixture.nativeElement.textContent).toContain('Non déterminé')
    expect(fixture.nativeElement.textContent).toContain('Non renseigné')
    params.next(convertToParamMap({ id: '8' }))
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Second jeu')
    expect(gameDetail.mock.calls).toEqual([[7], [8]])
  })

  it('displays missing-game errors and retries without losing the route subscription', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const gameDetail = vi.fn()
      .mockReturnValueOnce(throwError(() => ({ status: 404 })))
      .mockReturnValueOnce(of(detail))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '7' })) } },
      { provide: StatisticsApiService, useValue: { gameDetail } },
    ] })
    const fixture = TestBed.createComponent(GameStatisticsDetailComponent)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Jeu introuvable')
    fixture.componentInstance.retry.next()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Premier jeu')
    consoleError.mockRestore()
  })
})
