import { Player } from "./player.model"

/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 10/01/2023 - 12:08:24
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 10/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export interface Team {
    name: string
    position: number,
    players: Player[]
}