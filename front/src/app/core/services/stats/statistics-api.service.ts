import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable, catchError, of, tap } from 'rxjs'
import { environment } from 'src/environments/environment'

export interface ApiStatus {
  status: 'success' | 'error'
  message?: string
}

export interface StatisticsOverviewApi {
  totalMatches: number
  totalGames: number
  totalPlayers: number
  averageDurationMinutes: number
  mostPlayedGame: { name: string; value: number }
  bestPlayer: string
  gameRanking: Array<{ name: string; value: number }>
  winnerDistribution: Array<{ name: string; value: number }>
  status: 'success' | 'error'
}

export interface StatisticsGameApi {
  data: Array<{
    title: string
    matches: number
    averageDurationMinutes: number
    averageScoreGap: number
    averageWaitDays: number
    winner: string
  }>
  status: 'success' | 'error'
}

export interface StatisticsPlayerApi {
  data: Array<{
    name: string
    matches: number
    wins: number
    winRate: number
    favoriteGame: string
    averageScoreGap: number
  }>
  status: 'success' | 'error'
}

@Injectable({ providedIn: 'root' })
export class StatisticsApiService {
  private readonly baseUrl = `${environment.apiURL}/api/statistics`

  constructor(private http: HttpClient) {}

  public overview(): Observable<StatisticsOverviewApi | ApiStatus> {
    return this.http.get<StatisticsOverviewApi>(`${this.baseUrl}/overview`).pipe(
      tap(() => console.info('Statistics overview loaded')),
      catchError(error => {
        console.error('Statistics overview failed', error)
        return of({ status: 'error' as const, message: 'Erreur lors du chargement des statistiques globales' })
      })
    )
  }

  public games(): Observable<StatisticsGameApi | ApiStatus> {
    return this.http.get<StatisticsGameApi>(`${this.baseUrl}/games`).pipe(
      tap(() => console.info('Statistics games loaded')),
      catchError(error => {
        console.error('Statistics games failed', error)
        return of({ status: 'error' as const, message: 'Erreur lors du chargement des statistiques par jeu' })
      })
    )
  }

  public players(): Observable<StatisticsPlayerApi | ApiStatus> {
    return this.http.get<StatisticsPlayerApi>(`${this.baseUrl}/players`).pipe(
      tap(() => console.info('Statistics players loaded')),
      catchError(error => {
        console.error('Statistics players failed', error)
        return of({ status: 'error' as const, message: 'Erreur lors du chargement des statistiques par joueur' })
      })
    )
  }
}
