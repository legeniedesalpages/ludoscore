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
import { BaseGameColors } from '../model/game.model'
import { BaseGameTags, TagValueChange } from '../model/tag.model'
import { ScoreTagChange } from '../model/score.model'

export interface GameEntity {
    id: number
    title: string
    isExpansion?: boolean | number
    baseGameBggIds?: number[]
    additionalPlayers?: number
    baseGameColors?: BaseGameColors[]
    baseGameTags?: BaseGameTags[]
    expansionTagChanges?: TagValueChange[] | string | null
    expansionScoreChanges?: ScoreTagChange[] | string | null
    imageId: string
    thumbnailId: string
    isOnlyCooperative: boolean
    ownershipDate: Date | null
    inLibrary: boolean
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
    estimatedDuration: string
    scoreTemplate: string,
    estimatedDurationInMinutes: number
    createdAt: string
    playedMatchCount: number
    personalPlayedMatchCount: number
    libraryUserCount: number
}