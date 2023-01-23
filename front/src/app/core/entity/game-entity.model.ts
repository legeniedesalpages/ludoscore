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
    id: number,
    title: string,
    imageId: string,
    thumbnailId: string,
    isOnlyCooperative: boolean,
    minPlayers: number,
    maxPlayers: number,
    bggId: number
}