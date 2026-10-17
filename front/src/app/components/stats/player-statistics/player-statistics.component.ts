import { Component, DestroyRef, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { PlayerStatisticsDirectory } from 'src/app/core/model/player-statistics.model'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { LayoutComponent } from '../../layout/layout.component'
import { StatsQuestionComponent } from '../stats-question/stats-question.component'
import { StatsDurationPipe } from '../stats-duration.pipe'

@Component({
  imports: [RouterLink, DatePipe, MatButtonModule, LayoutComponent, StatsQuestionComponent, StatsDurationPipe],
  selector: 'app-player-statistics',
  styleUrls: ['../game-statistics/game-statistics.component.css', '../../../core/css/list.css'],
  templateUrl: './player-statistics.component.html',
})
export class PlayerStatisticsComponent {
  private readonly api = inject(StatisticsApiService)
  private readonly destroyRef = inject(DestroyRef)
  readonly statistics = signal<PlayerStatisticsDirectory | null>(null)
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)

  constructor() {
    this.load()
  }

  load(): void {
    this.loading.set(true)
    this.error.set(null)
    this.api.playerDirectory().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.statistics.set(result)
        this.loading.set(false)
      },
      error: error => {
        console.error('Player statistics failed', error)
        this.error.set('Impossible de charger les statistiques des joueurs.')
        this.loading.set(false)
      },
    })
  }
}
