import { CommonModule } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Subject, takeUntil } from 'rxjs'
import { LayoutComponent } from 'src/app/components/layout/layout.component'
import { PlayerStats, StatisticsService } from 'src/app/core/services/stats/statistics.service'

@Component({
  selector: 'app-statistics-by-player',
  templateUrl: './statistics-by-player.component.html',
  styleUrls: ['./statistics-by-player.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, LayoutComponent],
})
export class StatisticsByPlayerComponent implements OnInit {
  private store = inject(Store)
  private statisticsService = inject(StatisticsService)
  private destroy$ = new Subject<void>()

  public players: PlayerStats[] = []
  public error: string | null = null
  public loading = true

  ngOnInit(): void {
    this.statisticsService.loadPlayerStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.loading = result.loading
        this.error = result.error
        this.players = result.data ?? []
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  public returnToStatistics() {
    this.store.dispatch(new Navigate(['/statistics']))
  }

  public formatScoreGap(value: number): string {
    return `${value} pts`
  }
}
