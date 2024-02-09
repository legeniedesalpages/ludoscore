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
    gameId: number
    title: string,
    image: string,
    creating: boolean,
    started: boolean,
    startedAt: Date | undefined,
    minPlayers: number,
    maxPlayers: number,
    players: Player[]
}