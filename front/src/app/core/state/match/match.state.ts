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
import { Action, Selector, State, StateContext, StateToken } from "@ngxs/store";
import { MatchStateModel } from "./match.model";
import { Injectable } from '@angular/core';
import { AddPlayer, AddScoreToPlayer, AddTagToPlayer, CancelMatchCreation, CreateMatch, LaunchMatch, RemovePlayer } from "./match.action";
import { Player } from "../../model/player.model";
import { MatchService } from "../../services/match/match.service";
import { tap } from 'rxjs/operators';

const MATCH_STATE_TOKEN = new StateToken<MatchStateModel>('match');

export enum MatchStateEnum {
    CREATING,
    STARTED,
    FINISHED
}

@State<MatchStateModel>({
    name: MATCH_STATE_TOKEN,
    defaults: {
        gameId: 0,
        title: "",
        image: "",
        creating: false,
        started: false,
        startedAt: undefined,
        minPlayers: 0,
        maxPlayers: 0,
        players: []
    }
})
@Injectable()
export class MatchState {

    @Selector()
    static players(state: MatchStateModel): Player[] {
        return state.players
    }

    @Selector()
    static state(state: MatchStateModel): MatchStateEnum {
        return state.creating ? MatchStateEnum.CREATING : state.started ? MatchStateEnum.STARTED : MatchStateEnum.FINISHED
    }

    constructor(private matchService: MatchService) { }

    @Action(CreateMatch)
    createMatch({ setState }: StateContext<MatchStateModel>, createMatch: CreateMatch) {
        setState({
            gameId: createMatch.gameId,
            title: createMatch.title,
            image: createMatch.image,
            creating: true,
            started: false,
            startedAt: undefined,
            minPlayers: createMatch.minPlayers,
            maxPlayers: createMatch.maxPlayers,
            players: []
        })
    }

    @Action(LaunchMatch)
    launchMatch({ patchState, getState }: StateContext<MatchStateModel>) {
        return this.matchService.createMatch(getState().gameId, getState().players).pipe(tap((entity) =>
            patchState({
                creating: false,
                started: true,
                startedAt: entity.startedAt
            })))
    }

    @Action(CancelMatchCreation)
    cancelMatchCreation({ setState }: StateContext<MatchStateModel>) {
        setState({
            gameId: 0,
            title: "",
            image: "",
            creating: false,
            started: false,
            startedAt: undefined,
            minPlayers: 0,
            maxPlayers: 0,
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
            tags: [],
            score: 0
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
            console.warn("Cannot add tag to player because player is undefined")
            return
        }

        const modifiedPlayer = { ...player, tags: [...player.tags, tagAddedToPlayer.tag] }
        const modifiedPlayerList = getState().players.filter(p => p.id !== tagAddedToPlayer.playerId)
        modifiedPlayerList.push(modifiedPlayer)

        setState({
            ...getState(),
            players: modifiedPlayerList
        })
    }

    @Action(AddScoreToPlayer)
    addScoreToPlayer({ setState, getState }: StateContext<MatchStateModel>, scoreAddedToPlayer: AddScoreToPlayer) {
        const player: Player | undefined = getState().players.find(p => p.id == scoreAddedToPlayer.playerId)
        if (player === undefined) {
            console.warn("Cannot add tag to player because player is undefined => ", scoreAddedToPlayer.playerId)
            return
        }

        const modifiedPlayer = { ...player, score: scoreAddedToPlayer.score }
        const modifiedPlayerList = getState().players.filter(p => p.id != scoreAddedToPlayer.playerId)
        modifiedPlayerList.push(modifiedPlayer)

        setState({
            ...getState(),
            players: modifiedPlayerList
        })
    }
}