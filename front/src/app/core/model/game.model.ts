import { ScoreTag } from "./score.model"
import { ColorTag, Tag } from "./tag.model"

/**
    * @description      :
    * @author           : renau
    * @group            :
    * @created          : 09/01/2023 - 00:45:18
    *
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 09/01/2023
    * - Author          : renau
    * - Modification    :
**/
export interface Game extends GameDetail {
    id: number
    imageUrl: string
    thumbnailUrl: string
}

export interface SelectingGame extends Game {
    lastPlayed: Date
    lastWinner: string
}

export interface GameToSave extends GameDetail {
    id?: number
    imageUrlFromBgg?: string
    thumbnailUrlFromBgg?: string
}

export interface GameDetail {
    title: string
    isOnlyCooperative: boolean
    minPlayers: number
    maxPlayers: number
    ownershipDate: Date
    matchTags: Tag[]
    playerTags: Tag[]
    playerColors: ColorTag[]
    scoreTags: ScoreTag[]
    bggId: number
    drawAllowed: boolean
    drawBreaker: DrawBreaker[]
    quantifiableScore: boolean
    highestScoreWin: boolean
    estimatedDurationInMinutes: number
}

export interface DrawBreaker {
    reason: string
    withValue: boolean
}

export interface CancelReason {
    reason: string
    withValue: boolean
}