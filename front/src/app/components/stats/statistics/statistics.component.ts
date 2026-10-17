import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { RouterLink } from '@angular/router'
import { BehaviorSubject, Subject, switchMap, takeUntil } from 'rxjs'
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
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
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
  public period = 'all'
  public readonly periods = [
    { value: 'all', label: 'Depuis toujours', intro: '' },
    { value: 'year', label: 'Cette année', intro: 'Cette année' },
    { value: 'last3months', label: 'Les 3 derniers mois', intro: 'Ces 3 derniers mois' },
    { value: 'lastmonth', label: 'Le mois dernier', intro: 'Le mois dernier' },
    { value: 'lastweek', label: 'La semaine dernière', intro: 'La semaine dernière' },
  ]
  private period$ = new BehaviorSubject<string>('all')

  ngOnInit(): void {
    this.period$
      .pipe(switchMap(period => this.statisticsService.loadDashboard(period)), takeUntil(this.destroy$))
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

  public onPeriodChange(period: string): void {
    this.period = period
    this.period$.next(period)
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }

  public generalStory(stats: StatisticsDashboard): string {
    if (!stats.totalMatches) {
      return this.period === 'all'
        ? 'Les dés sont prêts, il ne manque plus qu’une première partie pour écrire l’histoire.'
        : this.withPeriod('aucune partie n’a été jouée, les dés se sont reposés.', true)
    }
    const habit = stats.favoritePeriod
      ? `, le plus souvent ${this.periodLabel(stats.favoritePeriod)} le ${stats.favoriteWeekday}`
      : ''
    return this.withPeriod(`autour de la table, vous avez déjà passé ${this.formatMinutes(stats.totalPlayMinutes)}${habit}, avec des parties qui durent ${this.formatMinutes(stats.averageDurationMinutes)} en moyenne.`, true)
  }

  public gamesStory(stats: StatisticsDashboard): string {
    if (!stats.mostPlayedGameCount) {
      return this.period === 'all'
        ? 'Votre ludothèque attend encore sa première partie.'
        : this.withPeriod('votre ludothèque est restée silencieuse.', true)
    }
    const longest = stats.longestMatch
      ? `. La plus longue partie a duré ${this.formatMinutes(stats.longestMatch.minutes)} sur ${stats.longestMatch.game}`
      : ''
    const waiting = stats.neverPlayedGames > 0
      ? `, pendant que ${stats.neverPlayedGames} ${stats.neverPlayedGames > 1 ? 'jeux patientent' : 'jeu patiente'} encore sur l’étagère`
      : ', et plus aucun jeu ne prend la poussière sur l’étagère'
    return this.withPeriod(`${stats.mostPlayedGame} s’est imposé comme votre favori avec ${this.plural(stats.mostPlayedGameCount, 'partie')}${longest}${waiting}.`, false)
  }

  public playersStory(stats: StatisticsDashboard): string {
    const active = stats.mostActivePlayer
    if (!stats.bestPlayerWins || !active) {
      return this.period === 'all'
        ? 'Personne n’a encore remporté de victoire : la place de champion est à prendre.'
        : this.withPeriod('personne n’a remporté de victoire : la place de champion est à prendre.', true)
    }
    if (active.name === stats.bestPlayer) {
      return this.withPeriod(`${stats.bestPlayer} règne sur la table avec ${this.plural(stats.bestPlayerWins, 'victoire')} en ${this.plural(active.matches, 'partie')}, et personne n’a trouvé comment le détrôner.`, false)
    }
    return this.withPeriod(`${stats.bestPlayer} règne sur la table avec ${this.plural(stats.bestPlayerWins, 'victoire')}, mais ${active.name} ne lâche rien avec ${this.plural(active.matches, 'partie')} disputées.`, false)
  }

  private withPeriod(text: string, lowerFirst: boolean): string {
    const intro = this.periods.find(p => p.value === this.period)?.intro
    if (!intro) {
      return lowerFirst ? text.charAt(0).toUpperCase() + text.slice(1) : text
    }
    return `${intro}, ${text}`
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
