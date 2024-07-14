/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 08/01/2023 - 15:44:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 08/01/2023
    * - Author          : renau
    * - Modification    : 
**/

export interface MatchEntity {
    id?: number
    gameId: number
    startedAt: Date | undefined
    finishedAt: Date | undefined
    canceled: boolean
    running: boolean
    tags: string
    winnerTeamId: number | undefined
    drawBreaker: string | undefined
    cancelReason: string | undefined
}

export interface MatchTeamEntity {
    id: number
    tags: string
    color: string
    score?: number,
    matchId: number,
    scoreDetails: string | undefined
}

export interface MatchTeamPlayerEntity {
    id: number
    position: number
    teamId: number
    playerId: number
}