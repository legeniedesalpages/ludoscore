/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 27/01/2023 - 00:18:37
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 27/01/2023
    * - Author          : renau
    * - Modification    : 
**/
export class CreateMatch {
    static readonly type: string = '[Match] CreateMatch';
    constructor(public gameId: number, public title: string, public image: string) { }
}

export class CancelMatchCreation {
    static readonly type: string = '[Match] CancelMatchCreation';
}

export class AddPlayer {
    static readonly type: string = '[Match] AddPlayer';
    constructor(public playerId: number, public playerName: string, public avatar: string) { }
}

export class RemovePlayer {
    static readonly type: string = '[Match] RemovePlayer';
    constructor(public playerId: number) { }
}

export class AddTagToPlayer {
    static readonly type: string = '[Match] AddTagToPlayer';
    constructor(public playerId: number, public tag: string) { }
}
