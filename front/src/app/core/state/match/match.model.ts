import { ChoosenTag } from "../../model/choosen-tag.model"
import { Game } from "../../model/game.model"
import { Player } from "../../model/player.model"

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
    game: Game | undefined,
    creating: boolean,
    started: boolean,
    startedAt: Date | undefined,
    endedAt: Date | undefined,
    players: Player[],
    choosenTags: ChoosenTag[],
    winnigPlayer: Player | undefined
}