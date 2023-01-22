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
export interface MatchEntity {
    id: number,
    created_at: Date
    updated_at: Date
    game_id: number,
    canceled: boolean,
    tags: string[],
    running: boolean,
    started_at: Date,
    finished_at: Date
}