import { Game } from "./game.model";
import { MatchPlayer } from "./matchPlayer.model";
import { Tag } from "./tag.model";

/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 14/01/2023 - 11:19:44
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 14/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export interface Match {
    game: Game | null,
    matchStarted: boolean,
    tags: Tag[],
    matchPlayers: MatchPlayer[]
}