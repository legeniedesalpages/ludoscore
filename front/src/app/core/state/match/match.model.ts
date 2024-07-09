import { ChoosenTag } from "../../model/choosen-tag.model"
import { ColorTag } from "../../model/color-tag.model"
import { Player } from "../../model/player.model"
import { Tag } from "../../model/tag.model"

/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 27/01/2023 - 00:17:06
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 27/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export interface MatchStateModel {
    matchId: number,
    gameId: number
    title: string,
    image: string,
    creating: boolean,
    started: boolean,
    startedAt: Date | undefined,
    endedAt: Date | undefined,
    minPlayers: number,
    maxPlayers: number,
    players: Player[],
    matchTags: Tag[],
    playerTags: Tag[],
    playerColors: ColorTag[],
    choosenTags: ChoosenTag[],
    winnigPlayer: Player | undefined,
}