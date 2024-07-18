import { Game } from "../../model/game.model"
import { Team } from "../../model/match.model"
import { Score } from "../../model/score.model"
import { ColorTag } from "../../model/tag.model"

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

/* MATCH */
export class CreateMatch {
    static readonly type: string = '[Match] CreateMatch'
    constructor(public game: Game) { }
}

export class CancelMatchCreation {
    static readonly type: string = '[Match] CancelMatchCreation'
}

export class UpdateGameTags {
    static readonly type: string = '[Match] UpdateGameTags'
    constructor(public tagsToAdd: [category: string, name: string, index: number][], public tagsToRemove: [category: string, index: number][]) { }
}

export class AddGameTags {
    static readonly type: string = '[Match] AddGameTags'
    constructor(public category: string, public name: string, public index: number) { }
}

export class RemoveGameTags {
    static readonly type: string = '[Match] RemoveGameTags'
    constructor(public category: string, public index: number) { }
}

export class LaunchMatch {
    static readonly type: string = '[Match] LaunchMatch'
}

export class MatchEnded {
    static readonly type: string = '[Match] MatchEnded'
    constructor(public endDate: Date) { }
}

export class SaveMatchResult {
    static readonly type: string = '[Match] SaveMatchResult'
}

export class MatchAborted {
    static readonly type: string = '[Match] MatchAborted'
}

export class SetWinningTeam {
    static readonly type: string = '[Match] SetWinningTeam'
    constructor(public team: Team) { }
}


/* TEAM */
export class AddTeam {
    static readonly type: string = '[Match] AddTeam'
    constructor(public team: Team) { }
}

export class ChangeTeamColor {
    static readonly type: string = '[Match] ChangeTeamColor'
    constructor(public team: Team, public color: ColorTag) { }
}

export class ChangeFirstTeam {
    static readonly type: string = '[Match] ChangeFirstTeam'
    constructor(public team: Team) { }
}

export class SwapTeamPosition {
    static readonly type: string = '[Match] SwapTeamPosition'
    constructor(public firstTeam: Team, public secondTeam: Team) { }
}

export class RemoveTeam {
    static readonly type: string = '[Match] RemoveTeam'
    constructor(public team: Team) { }
}

export class UpdateTeamTags {
    static readonly type: string = '[Match] UpdateTeamTags'
    constructor(public team: Team, public tagsToAdd: [category: string, name: string, index: number][], public tagsToRemove: [category: string, index: number][]) { }
}

export class AddScoreToTeam {
    static readonly type: string = '[Match] AddScoreToTeam'
    constructor(public team: Team, public score: number, public scoreDetail: Score[]) { }
}