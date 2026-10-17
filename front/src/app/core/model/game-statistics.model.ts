export interface StatisticsChart {
  title: string
  type: 'bar' | 'line' | 'pie' | 'table'
  columns: string[]
  rows: Array<Array<string | number | null>>
  comment?: string
}

export interface PlaySummary {
  matches: number
  totalPlayMinutes: number
  averageDurationMinutes: number | null
  minDurationMinutes: number | null
  maxDurationMinutes: number | null
  measuredMatches: number
}

export interface LibraryGameStatistics extends PlaySummary {
  id: number
  title: string
  thumbnailId: string | null
  createdAt: string | null
}

export interface GameStatisticsLibrary {
  summary: PlaySummary & { totalGames: number; playedGames: number }
  data: LibraryGameStatistics[]
}

export interface GameStatisticsDetail extends PlaySummary {
  id: number
  title: string
  averageWaitDays: number | null
  charts: StatisticsChart[]
}

export interface StatisticsQuestion {
  question: string
  scope?: 'game'
  id?: number
}
