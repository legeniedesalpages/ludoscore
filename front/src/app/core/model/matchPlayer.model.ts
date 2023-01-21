/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 14/01/2023 - 16:10:43
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 14/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Player } from "./player.model";
import { Tag } from "./tag.model";

export interface MatchPlayer {
    player: Player[],
    color: String | null,
    tags: Tag[],
    uuid: string
}