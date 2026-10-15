import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Subject, takeUntil } from 'rxjs'
import { LayoutComponent } from 'src/app/components/layout/layout.component'
import { StatisticsDashboard, StatisticsService } from 'src/app/core/services/stats/statistics.service'

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    LayoutComponent,
  ]
})
export class StatisticsComponent implements OnInit, OnDestroy {
  private store = inject(Store)
  private statisticsService = inject(StatisticsService)
  private changeDetectorRef = inject(ChangeDetectorRef)
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
        this.changeDetectorRef.markForCheck()
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }

  public generalStory(stats: StatisticsDashboard): string {
    if (!stats.totalMatches) {
      return 'Les dés sont prêts, il ne manque plus qu’une première partie pour écrire l’histoire.'
    }
    const habit = stats.favoritePeriod
      ? `, le plus souvent ${this.periodLabel(stats.favoritePeriod)} le ${stats.favoriteWeekday}`
      : ''
    return `Autour de la table, vous avez déjà passé ${this.formatMinutes(stats.totalPlayMinutes)}${habit}, avec des parties qui durent ${this.formatMinutes(stats.averageDurationMinutes)} en moyenne.`
  }

  public gamesStory(stats: StatisticsDashboard): string {
    if (!stats.mostPlayedGameCount) {
      return 'Votre ludothèque attend encore sa première partie.'
    }
    const longest = stats.longestMatch
      ? `, dont la plus longue a duré ${this.formatMinutes(stats.longestMatch.minutes)} sur ${stats.longestMatch.game}`
      : ''
    const waiting = stats.neverPlayedGames > 0
      ? `, pendant que ${stats.neverPlayedGames} ${stats.neverPlayedGames > 1 ? 'jeux patientent' : 'jeu patiente'} encore sur l’étagère`
      : ', et plus aucun jeu ne prend la poussière sur l’étagère'
    return `${stats.mostPlayedGame} s’est imposé comme votre favori avec ${this.plural(stats.mostPlayedGameCount, 'partie')}${longest}${waiting}.`
  }

  public playersStory(stats: StatisticsDashboard): string {
    const active = stats.mostActivePlayer
    if (!stats.bestPlayerWins || !active) {
      return 'Personne n’a encore remporté de victoire : la place de champion est à prendre.'
    }
    if (active.name === stats.bestPlayer) {
      return `${stats.bestPlayer} règne sur la table avec ${this.plural(stats.bestPlayerWins, 'victoire')} en ${this.plural(active.matches, 'partie')}, et personne n’a encore trouvé comment le détrôner.`
    }
    return `${stats.bestPlayer} règne sur la table avec ${this.plural(stats.bestPlayerWins, 'victoire')}, mais ${active.name} ne lâche rien avec ${this.plural(active.matches, 'partie')} disputées.`
  }

  private plural(count: number, word: string): string {
    return `${count} ${word}${count > 1 ? 's' : ''}`
  }

  public periodLabel(period: string | null): string {
    switch (period) {
      case 'matin': return 'le matin'
      case 'après-midi': return 'l’après-midi'
      case 'soirée': return 'en soirée'
      default: return 'la nuit'
    }
  }

  public formatMinutes(value: number | null | undefined): string {
    if (value == null) {
      return '(non déterminé)'
    }
    if (value <= 0) {
      return '0 min'
    }
    const hours = Math.floor(value / 60)
    const minutes = Math.round(value % 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`
  }
}
