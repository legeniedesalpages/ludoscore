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
import { AddPlayer, AddTagToPlayer, CancelMatchCreation, CreateMatch, RemovePlayer } from "./match.action";
import { Player } from "../../model/player.model";

@State<MatchStateModel>({
    name: 'match',
    defaults: {
        gameId: 0,
        title: "",
        image: "",
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
    createMatch({ setState }: StateContext<MatchStateModel>, createMatch: CreateMatch) {
        setState({
            gameId: createMatch.gameId,
            title: createMatch.title,
            image: createMatch.image,
            creating: true,
            started: false,
            players: []
        })
    }

    @Action(CancelMatchCreation)
    cancelMatchCreation({ setState }: StateContext<MatchStateModel>) {
        setState({
            gameId: 0,
            title: "",
            image: "",
            creating: true,
            started: false,
            players: []
        })
    }

    @Action(AddPlayer)
    addPlayer({ setState, getState }: StateContext<MatchStateModel>, addedPlayer: AddPlayer) {

        if (getState().players.find(p => p.id === addedPlayer.playerId)) {
            console.warn("Player already added")
            return
        }

        const newPlayerList = Object.assign([], getState().players);
        newPlayerList.push({
            id: addedPlayer.playerId,
            avatar: addedPlayer.avatar,
            name: addedPlayer.playerName,
            tags: []
        })
        setState({
            ...getState(),
            players: newPlayerList
        })
    }

    @Action(RemovePlayer)
    removePlayer({ setState, getState }: StateContext<MatchStateModel>, removedPlayer: RemovePlayer) {
        setState({
            ...getState(),
            players: getState().players.filter(p => p.id !== removedPlayer.playerId)
        })
    }

    @Action(AddTagToPlayer)
    addTagToPlayer({ setState, getState }: StateContext<MatchStateModel>, tagAddedToPlayer: AddTagToPlayer) {

        const player: Player | undefined = getState().players.find(p => p.id === tagAddedToPlayer.playerId)
        if (player === undefined) {
            console.warn("Cannot add tag to player")
            return
        }

        const modifiedPlayer = {...player, tags: [...player.tags, tagAddedToPlayer.tag]}
        const modifiedPlayerList = getState().players.filter(p => p.id !== tagAddedToPlayer.playerId)
        modifiedPlayerList.push(modifiedPlayer)

        setState({
            ...getState(),
            players: modifiedPlayerList
        })
    }
}