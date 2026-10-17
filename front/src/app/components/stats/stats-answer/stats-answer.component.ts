import { Component, DestroyRef, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { HttpErrorResponse } from '@angular/common/http'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { StatisticsChart, StatisticsQuestion } from 'src/app/core/model/game-statistics.model'
import { StatisticsApiService } from 'src/app/core/services/stats/statistics-api.service'
import { StatsChartComponent } from '../stats-chart/stats-chart.component'

@Component({
  imports: [MatDialogModule, MatButtonModule, StatsChartComponent],
  selector: 'app-stats-answer',
  styleUrl: './stats-answer.component.css',
  templateUrl: './stats-answer.component.html',
})
export class StatsAnswerComponent {
  readonly question = inject<StatisticsQuestion>(MAT_DIALOG_DATA)
  private readonly api = inject(StatisticsApiService)
  private readonly destroyRef = inject(DestroyRef)
  readonly answer = signal<StatisticsChart | null>(null)
  readonly loading = signal(false)
  readonly error = signal<string | null>(null)

  constructor() {
    this.load()
  }

  load(): void {
    this.loading.set(true)
    this.error.set(null)
    this.api.ask(this.question).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: answer => {
        this.answer.set(answer)
        this.loading.set(false)
      },
      error: (error: HttpErrorResponse) => {
        console.error('Statistics assistant failed', error)
        this.error.set(error.status === 429
          ? 'Trop de questions rapprochées. Réessayez dans une minute.'
          : 'L’assistant statistiques est indisponible. Vous pouvez réessayer.')
        this.loading.set(false)
      },
    })
  }
}
