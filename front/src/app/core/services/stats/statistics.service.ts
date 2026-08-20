import { Injectable } from '@angular/core'
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { StatisticsApiService } from './statistics-api.service'

export interface PlayerStats {
  name: string
  matches: number
  wins: number
  winRate: number
  favoriteGame: string
  averageScoreGap: number
}

export interface GameStats {
  title: string
  matches: number
  averageDurationMinutes: number
  averageScoreGap: number
  averageWaitDays: number
  winner: string
}

export interface TopBarItem {
  label: string
  value: number
  percent: number
  color: string
}

export interface WinnerDistribution {
  label: string
  value: number
  color: string
}

export interface StatisticsDashboard {
  totalMatches: number
  totalGames: number
  totalPlayers: number
  averageDurationMinutes: number
  mostPlayedGame: string
  bestPlayer: string
  topGames: TopBarItem[]
  winnerDistribution: WinnerDistribution[]
  playerStats: PlayerStats[]
  gameStats: GameStats[]
}

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  constructor(private statisticsApi: StatisticsApiService) {}

  public loadDashboard(): Observable<{ dashboard: StatisticsDashboard | null; error: string | null; loading: boolean }> {
    return this.statisticsApi.overview().pipe(
      map((overview: any) => {
        if (!overview || overview.status === 'error') {
          return { dashboard: null, error: overview?.message ?? 'Erreur inconnue', loading: false }
        }

        const dashboard: StatisticsDashboard = {
          totalMatches: overview.totalMatches ?? 0,
          totalGames: overview.totalGames ?? 0,
          totalPlayers: overview.totalPlayers ?? 0,
          averageDurationMinutes: overview.averageDurationMinutes ?? 0,
          mostPlayedGame: overview.mostPlayedGame?.name ?? 'Aucun',
          bestPlayer: overview.bestPlayer ?? 'Aucun',
          topGames: (overview.gameRanking ?? []).map((item: any, index: number) => ({
            label: item.name,
            value: Number(item.value ?? 0),
            percent: 0,
            color: ['#5296ff', '#6ad0a6', '#ffb454', '#ff7f7f', '#a88cf1', '#72c4d4'][index % 6],
          })),
          winnerDistribution: (overview.winnerDistribution ?? []).map((item: any, index: number) => ({
            label: item.name || 'Inconnu',
            value: Number(item.value ?? 0),
            color: ['#5296ff', '#6ad0a6', '#ffb454', '#ff7f7f', '#c29ef7', '#8ad1d9'][index % 6],
          })),
          playerStats: [],
          gameStats: [],
        }

        const maxTopGame = Math.max(...dashboard.topGames.map(item => item.value), 1)
        dashboard.topGames = dashboard.topGames.map(item => ({ ...item, percent: Math.round((item.value / maxTopGame) * 100) }))

        return { dashboard, error: null, loading: false }
      })
    )
  }

  public loadGameStats(): Observable<{ data: GameStats[] | null; error: string | null; loading: boolean }> {
    return this.statisticsApi.games().pipe(
      map((response: any) => {
        if (!response || response.status === 'error') {
          return { data: null, error: response?.message ?? 'Erreur inconnue', loading: false }
        }
        return { data: response.data ?? [], error: null, loading: false }
      })
    )
  }

  public loadPlayerStats(): Observable<{ data: PlayerStats[] | null; error: string | null; loading: boolean }> {
    return this.statisticsApi.players().pipe(
      map((response: any) => {
        if (!response || response.status === 'error') {
          return { data: null, error: response?.message ?? 'Erreur inconnue', loading: false }
        }
        return { data: response.data ?? [], error: null, loading: false }
      })
    )
  }
}
