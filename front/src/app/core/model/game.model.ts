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
export interface Game {
    id: number | null,
    title: string,
    image_id: string,
    thumbnail_id: string,
    isOnlyCooperative: boolean,
    min_players: number,
    max_players: number,
    ownershipDate: Date,
    matchTags: Tag[],
    playerTags: Tag[],
    playerColors: ColorTag[],
    bggId: number,
    created_at: string | null
}