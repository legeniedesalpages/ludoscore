/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 28/01/2023 - 10:39:46
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 28/01/2023
    * - Author          : renau
    * - Modification    : 
**/

import { CancelReason, DrawBreaker, Game } from "./game.model"
import { Player } from "./player.model"
import { Score } from "./score.model"
import { ColorTag } from "./tag.model"

export interface MatchModel {
    matchId?: number
    game: Game
    creating: boolean
    started: boolean
    startedAt?: Date
    endedAt?: Date
    teams: Team[]
    choosenTags: ChoosenTag[]
    winningTeam?: Team
    drawBreaker?: ChoosedDrawBreaker
    canceled?: boolean
    cancelReason?: string
}

export interface Team {
    id?: number
    name: string
    choosenTags: ChoosenTag[]
    color: ColorTag
    score: number | undefined
    scoreDetails: Score[]
    teamPlayers: TeamPlayer[]
}

export interface TeamPlayer {
    id?: number
    player: Player
}

export interface ChoosedDrawBreaker {
    drawBreaker: DrawBreaker
    value: string
}

export interface ChoosedCancelReason {
    cancelReason: CancelReason
    value: string
}

export interface ChoosenTag {
    category: string
    names: string[]
}