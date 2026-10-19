import { Component, DestroyRef, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { catchError, of, startWith, Subject, switchMap } from 'rxjs'
import { PlayerStatisticsDetail } from 'src/app/core/model/player-statistics.model'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { LayoutComponent } from '../../layout/layout.component'
import { StatsChartComponent } from '../stats-chart/stats-chart.component'
import { StatsQuestionComponent } from '../stats-question/stats-question.component'
import { StatsDurationPipe } from '../stats-duration.pipe'

import { PlayerNamePipe } from 'src/app/core/pipes/player-name.pipe'

@Component({
  imports: [PlayerNamePipe, RouterLink, MatButtonModule, LayoutComponent, StatsChartComponent, StatsQuestionComponent, StatsDurationPipe],
  selector: 'app-player-statistics-detail',
  styleUrl: '../game-statistics-detail/game-statistics-detail.component.css',
  templateUrl: './player-statistics-detail.component.html',
})
export class PlayerStatisticsDetailComponent {
  private readonly api = inject(StatisticsApiService)
  private readonly route = inject(ActivatedRoute)
  readonly retry = new Subject<void>()
  readonly statistics = signal<PlayerStatisticsDetail | null>(null)
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)

  constructor() {
    this.route.paramMap.pipe(
      switchMap(params => this.retry.pipe(
        startWith(undefined),
        switchMap(() => {
          this.loading.set(true)
          this.error.set(null)
          return this.api.playerDetail(Number(params.get('id'))).pipe(
            catchError(error => {
              console.error('Player statistics detail failed', error)
              this.error.set(error.status === 404 ? 'Joueur introuvable.' : 'Impossible de charger les statistiques de ce joueur.')
              return of(null)
            }),
          )
        }),
      )),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(result => {
      this.statistics.set(result)
      this.loading.set(false)
    })
  }
}
