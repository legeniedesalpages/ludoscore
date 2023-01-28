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
import { AddPlayer, CancelMatchCreation, CreateMatch } from "./match.action";
import { Player } from "../../model/player.model";

@State<MatchStateModel>({
    name: 'match',
    defaults: {
        gameId: 0,
        gameTitle: "",
        creating: true,
        started: false,
        players: []
    }
})
@Injectable()
export class MatchState {

    @Selector()
    static players(state: MatchStateModel): Player[] {
        return state.players
    }

    constructor() { }

    @Action(CreateMatch)
    createMatch({ setState, getState }: StateContext<MatchStateModel>, createMatch: CreateMatch) {
        setState({
            ...getState(),
            gameId: createMatch.gameId,
            gameTitle: createMatch.gameTitle,
            creating: true,
            started: false,
            players: []
        })
    }

    @Action(CancelMatchCreation)
    cancelMatchCreation({ setState }: StateContext<MatchStateModel>) {
        setState({
            gameId: 0,
            gameTitle: "",
            creating: true,
            started: false,
            players: []
        })
    }

    @Action(AddPlayer)
    addPlayer({ setState, getState }: StateContext<MatchStateModel>, addPlayer: AddPlayer) {
        const newPlayerList = Object.assign([], getState().players);
        newPlayerList.push({
            id: addPlayer.playerId,
            avatar: addPlayer.avatar,
            name: addPlayer.playerName
        })
        setState({
            ...getState(),
            players: newPlayerList
        })
    }
}