import { Tag } from "../model/tag.model";

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
export interface GameEntity {
    id: number
    title: string
    imageId: string
    thumbnailId: string
    isOnlyCooperative: boolean
    ownershipDate: Date
    minPlayers: number
    maxPlayers: number
    bggId: number
    matchTags: string
    playerTags: string
    playerColors: string
    drawAllowed: boolean
    drawBreaker: string
    quantifiableScore: boolean
    highestScoreWin: boolean
}