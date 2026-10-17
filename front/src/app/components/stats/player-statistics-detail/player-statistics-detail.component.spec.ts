import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { By } from '@angular/platform-browser'
import { BehaviorSubject, of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { PlayerStatisticsDetail } from 'src/app/core/model/player-statistics.model'
import { StatsQuestionComponent } from '../stats-question/stats-question.component'
import { PlayerStatisticsDetailComponent } from './player-statistics-detail.component'

describe('PlayerStatisticsDetailComponent', () => {
  const detail: PlayerStatisticsDetail = {
    id: 7, name: 'Alice', matches: 3, totalPlayMinutes: 90, averageDurationMinutes: 45,
    minDurationMinutes: 30, maxDurationMinutes: 60, measuredMatches: 2, averageWaitDays: 1,
    wins: 1, decidedMatches: 2, winRate: 50, gamesPlayed: 1,
    charts: [
      { title: 'Couleurs jouées', type: 'bar', columns: ['Couleur', 'Parties'], rows: [['Rouge', 3]] },
      { title: 'Tags des joueurs / équipes', type: 'table', columns: ['Tag', 'Victoires'], rows: [['Rôle: Mage', 1]] },
    ],
  }

  it('renders dimensions, scopes the AI prompt and reacts to a changed player route', async () => {
    const params = new BehaviorSubject(convertToParamMap({ id: '7' }))
    const playerDetail = vi.fn().mockReturnValueOnce(of(detail))
      .mockReturnValueOnce(of({ ...detail, id: 8, name: 'Bob', matches: 0, winRate: null, averageWaitDays: null }))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: StatisticsApiService, useValue: { playerDetail } },
    ] })
    const fixture = TestBed.createComponent(PlayerStatisticsDetailComponent)
    await fixture.whenStable()
    expect(fixture.nativeElement.textContent).toContain('50 %')
    expect(fixture.nativeElement.textContent).toContain('Rouge')
    expect(fixture.nativeElement.textContent).toContain('Rôle: Mage')
    expect(fixture.debugElement.query(By.directive(StatsQuestionComponent)).componentInstance.playerId()).toBe(7)
    params.next(convertToParamMap({ id: '8' }))
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Bob')
    expect(fixture.nativeElement.textContent).toContain('Ce joueur n’a pas encore de partie terminée')
    expect(fixture.nativeElement.textContent).toContain('Non déterminé')
    expect(fixture.debugElement.query(By.directive(StatsQuestionComponent)).componentInstance.playerId()).toBe(8)
    expect(playerDetail.mock.calls).toEqual([[7], [8]])
  })

  it('shows missing-player errors and allows retrying', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const playerDetail = vi.fn()
      .mockReturnValueOnce(throwError(() => ({ status: 404 })))
      .mockReturnValueOnce(of(detail))
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '7' })) } },
      { provide: StatisticsApiService, useValue: { playerDetail } },
    ] })
    const fixture = TestBed.createComponent(PlayerStatisticsDetailComponent)
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Joueur introuvable')
    fixture.componentInstance.retry.next()
    await fixture.whenStable()
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeNull()
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Alice')
    consoleError.mockRestore()
  })
})
