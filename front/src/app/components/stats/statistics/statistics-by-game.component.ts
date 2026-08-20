import { CommonModule } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Subject, takeUntil } from 'rxjs'
import { LayoutComponent } from 'src/app/components/layout/layout.component'
import { GameStats, StatisticsService } from 'src/app/core/services/stats/statistics.service'

@Component({
  selector: 'app-statistics-by-game',
  templateUrl: './statistics-by-game.component.html',
  styleUrls: ['./statistics-by-game.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, LayoutComponent],
})
export class StatisticsByGameComponent implements OnInit {
  private store = inject(Store)
  private statisticsService = inject(StatisticsService)
  private destroy$ = new Subject<void>()

  public games: GameStats[] = []
  public error: string | null = null
  public loading = true

  ngOnInit(): void {
    this.statisticsService.loadGameStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.loading = result.loading
        this.error = result.error
        this.games = result.data ?? []
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  public returnToStatistics() {
    this.store.dispatch(new Navigate(['/statistics']))
  }

  public formatMinutes(value: number): string {
    if (value <= 0) {
      return '0 min'
    }
    const hours = Math.floor(value / 60)
    const minutes = Math.round(value % 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`
  }
}
