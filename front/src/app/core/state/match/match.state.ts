/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 27/01/2023 - 00:19:47
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 27/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Action, Selector, State, StateContext } from "@ngxs/store";
import { MatchStateModel } from "./match.model";
import { Injectable } from '@angular/core';
import { CancelMatchCreation, CreateMatch } from "./match.action";

@State<MatchStateModel>({
    name: 'match',
    defaults: {
        gameId: 0,
        gameTitle: "",
        creating: true,
        started: false
    }
})
@Injectable()
export class MatchState {

    constructor() { }

    @Action(CreateMatch)
    createMatch({ setState, getState }: StateContext<MatchStateModel>, createMatch: CreateMatch) {
        setState({
            ...getState(),
            gameId: createMatch.gameId,
            gameTitle: createMatch.gameTitle,
            creating: true,
            started: false
        })
    }

    @Action(CancelMatchCreation)
    cancelMatchCreation({ setState }: StateContext<MatchStateModel>) {
        setState({
            gameId: 0,
            gameTitle: "",
            creating: true,
            started: false
        })
    }
}