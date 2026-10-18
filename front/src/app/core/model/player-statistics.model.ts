import { PlaySummary, StatisticsChart } from './game-statistics.model'

export interface PlayerStatistics extends PlaySummary {
  id: number
  name: string
  creatorPseudo?: string | null
  createdAt: string | null
  wins: number
  decidedMatches: number
  winRate: number | null
  gamesPlayed: number
}

export interface PlayerStatisticsDirectory {
  summary: PlaySummary & { totalPlayers: number; activePlayers: number }
  data: PlayerStatistics[]
}

export interface PlayerStatisticsDetail extends Omit<PlayerStatistics, 'createdAt'> {
  averageWaitDays: number | null
  charts: StatisticsChart[]
}
