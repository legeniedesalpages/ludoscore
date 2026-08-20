import { CommonModule } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Subject, takeUntil } from 'rxjs'
import { LayoutComponent } from 'src/app/components/layout/layout.component'
import { StatisticsDashboard, StatisticsService } from 'src/app/core/services/stats/statistics.service'

@Component({
  selector: 'app-statistics-overview',
  templateUrl: './statistics-overview.component.html',
  styleUrls: ['./statistics-overview.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, LayoutComponent],
})
export class StatisticsOverviewComponent implements OnInit {
  private store = inject(Store)
  private statisticsService = inject(StatisticsService)
  private destroy$ = new Subject<void>()

  public dashboard: StatisticsDashboard | null = null
  public error: string | null = null
  public loading = true

  ngOnInit(): void {
    this.statisticsService.loadDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.loading = result.loading
        this.error = result.error
        this.dashboard = result.dashboard
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

  public donutGradient(items: { label: string; value: number; color: string }[]): string {
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1
    let current = 0
    const stops = items.map(item => {
      const start = current / total * 100
      current += item.value
      const end = current / total * 100
      return `${item.color} ${start}% ${end}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }

  public donutDash(value: number, items: { label: string; value: number; color: string }[]): string {
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1
    return `${(value / total) * 100} ${100 - (value / total) * 100}`
  }

  public donutOffset(index: number, items: { label: string; value: number }[]): number {
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1
    return -items.slice(0, index).reduce((sum, item) => sum + (item.value / total) * 100, 0)
  }
}
