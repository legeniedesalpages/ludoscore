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

export interface MatchEntity {
    id?: number,
    gameId: number,
    players: number[],
    startedAt: Date | undefined,
    finishedAt: Date | undefined,
    canceled: boolean,
    running: boolean
}