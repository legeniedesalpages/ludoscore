import { ColorTag } from "./color-tag.model";
import { Tag } from "./tag.model";

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
    bggId: number
    drawAllowed: boolean
    drawBreaker: DrawBreaker[]
    quantifiableScore: boolean
    highestScoreWin: boolean
}

export interface DrawBreaker {
    name: string
    withValue: boolean
}