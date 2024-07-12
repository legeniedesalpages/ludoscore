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
import { Action, Selector, State, StateContext, StateToken } from "@ngxs/store"
import { MatchStateModel } from "./match.model"
import { Injectable } from '@angular/core'
import { AddPlayer, AddScoreToPlayer, AddTagToMatch, AddTagToPlayer, CancelMatchCreation, ChangeFirstPlayer, ChangePlayerColor, CreateMatch, LaunchMatch, MatchAborted, MatchEnded, RemovePlayer, SaveMatchResult, SwapPlayerPosition } from "./match.action"
import { Player } from "../../model/player.model"
import { MatchService } from "../../services/match/match.service"
import { tap } from 'rxjs/operators'
import { ChoosenTag } from "../../model/choosen-tag.model"
import { ColorTag } from "../../model/color-tag.model"

const MATCH_STATE_TOKEN = new StateToken<MatchStateModel>('match')

export enum MatchStateEnum {
    CREATING,
    STARTED,
    FINISHED
}

const defaultMatchModel = {
    matchId: 0,
    game: undefined,
    creating: false,
    started: false,
    startedAt: undefined,
    endedAt: undefined,
    players: [],
    choosenTags: [],
    winnigPlayer: undefined,
};

@State<MatchStateModel>({
    name: MATCH_STATE_TOKEN,
    defaults: defaultMatchModel
})
@Injectable()
export class MatchState {

    @Selector()
    static players(state: MatchStateModel): Player[] {
        return state.players
    }

    @Selector()
    static matchTags(state: MatchStateModel): ChoosenTag[] {
        return state.choosenTags
    }

    @Selector()
    static state(state: MatchStateModel): MatchStateEnum {
        return state.creating ? MatchStateEnum.CREATING : state.started ? MatchStateEnum.STARTED : MatchStateEnum.FINISHED
    }

    constructor(private matchService: MatchService) { }

    @Action(CreateMatch)
    createMatch({ setState }: StateContext<MatchStateModel>, createMatch: CreateMatch) {
        setState({
            matchId: 0,
            game: createMatch.game,
            creating: true,
            started: false,
            startedAt: undefined,
            endedAt: undefined,
            players: [],
            choosenTags: [],
            winnigPlayer: undefined
        })
    }

    @Action(LaunchMatch)
    launchMatch({ patchState, getState }: StateContext<MatchStateModel>) {
        return this.matchService.createMatch(getState().game?.id!, getState().players, getState().choosenTags).pipe(tap((entity) =>
            patchState({
                matchId: entity.id,
                creating: false,
                started: true,
                startedAt: entity.startedAt
            })))
    }

    @Action(CancelMatchCreation)
    cancelMatchCreation({ setState }: StateContext<MatchStateModel>) {
        setState(defaultMatchModel)
    }

    @Action(AddPlayer)
    addPlayer({ setState, getState }: StateContext<MatchStateModel>, addedPlayer: AddPlayer) {

        if (getState().players.find(p => p.id === addedPlayer.playerId)) {
            console.warn("Player already added")
            return
        }

        const newPlayerList = Object.assign([], getState().players)
        newPlayerList.push({
            id: addedPlayer.playerId,
            avatar: addedPlayer.avatar,
            name: addedPlayer.playerName,
            choosenTags: [],
            color: addedPlayer.color,
            score: undefined
        })
        setState({
            ...getState(),
            players: newPlayerList
        })
    }

    @Action(ChangeFirstPlayer)
    changeFirstPlayer({ setState, getState }: StateContext<MatchStateModel>, firstPlayer: ChangeFirstPlayer) {
        console.info("Player order change")
        let newOrderPlayers: Player[] = []
        newOrderPlayers.push(firstPlayer.player)
        getState().players.forEach(player => {
            if (player.id != firstPlayer.player.id) {
                newOrderPlayers.push(player)
            }
        })
        setState({
            ...getState(),
            players: newOrderPlayers
        })
    }

    @Action(ChangePlayerColor)
    changePlayerColor({ setState, getState }: StateContext<MatchStateModel>, playerWithColorToChange: ChangePlayerColor) {

        const oldColor: ColorTag = getState().players.find(p => p.id == playerWithColorToChange.playerId)!.color

        const modifiedPlayerList: Player[] = getState().players.map(player => {
            let pp : Player = player
            if (player.id == playerWithColorToChange.playerId) {
                pp = { ...player, color: playerWithColorToChange.color }
            }
            if (player.id != playerWithColorToChange.playerId && player.color.name == playerWithColorToChange.color.name) {
                pp = { ...player, color: oldColor }
            }
            return pp
        })

        setState({
            ...getState(),
            players: modifiedPlayerList
        })
    }

    @Action(SwapPlayerPosition)
    swapPlayerPosition({ setState, getState }: StateContext<MatchStateModel>, playersToSwap: SwapPlayerPosition) {
        console.info("Player order swap")
        let newOrderPlayers: Player[] = []
        
        getState().players.forEach(player => {
            if (player.id == playersToSwap.firstPlayer.id) {
                newOrderPlayers.push(playersToSwap.secondPlayer)
            } else if (player.id == playersToSwap.secondPlayer.id) {
                newOrderPlayers.push(playersToSwap.firstPlayer)
            } else {
                newOrderPlayers.push(player)
            }
        })
        setState({
            ...getState(),
            players: newOrderPlayers
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

        console.log("Ajout d'un tag de joueur: ", tagAddedToPlayer.playerId, tagAddedToPlayer.category, tagAddedToPlayer.name, tagAddedToPlayer.index)

        const player: Player | undefined = getState().players.find(p => p.id === tagAddedToPlayer.playerId)
        if (player === undefined) {
            console.warn("Cannot add tag to player because player is undefined")
            return
        }

        const categoryTag = player.choosenTags.filter(tags => tags.category == tagAddedToPlayer.category)[0]
        const length = getState().game!.playerTags.filter(tag => tag.category == tagAddedToPlayer.category)[0].maxOcurrences
        let names: string[] = []
        for (let i = 0; i < length; i++) {
            if (i == tagAddedToPlayer.index) {
                names.push(tagAddedToPlayer.name)
            } else {
                if (categoryTag != undefined) {
                    names.push(categoryTag.names[i])
                } else {
                    names.push(categoryTag)
                }
            }
        }
        console.log("Nouvelle liste de tags: ", tagAddedToPlayer.category, names)

        const modifiedChoosenTags: ChoosenTag[] = Object.assign([], player.choosenTags.filter(tags => tags.category != tagAddedToPlayer.category))
        modifiedChoosenTags.push({ category: tagAddedToPlayer.category, names: names })

        const modifiedPlayerList = getState().players.map(unmodifiedPlayer => {
            if (unmodifiedPlayer.id != tagAddedToPlayer.playerId) {
                return unmodifiedPlayer
            } else {
                return { ...player, choosenTags: modifiedChoosenTags }
            }
        })

        setState({
            ...getState(),
            players: modifiedPlayerList
        })
    }

    @Action(AddTagToMatch)
    addTagToMatch({ setState, getState }: StateContext<MatchStateModel>, tagAddedToMatch: AddTagToMatch) {

        console.log("Ajout d'un tag de match: ", tagAddedToMatch.category, tagAddedToMatch.name, tagAddedToMatch.index)

        const categoryTag = getState().choosenTags.filter(tags => tags.category == tagAddedToMatch.category)[0]
        const length = getState().game!.matchTags.filter(tag => tag.category == tagAddedToMatch.category)[0].maxOcurrences
        let names: string[] = []
        for (let i = 0; i < length; i++) {
            if (i == tagAddedToMatch.index) {
                names.push(tagAddedToMatch.name)
            } else {
                if (categoryTag != undefined) {
                    names.push(categoryTag.names[i])
                } else {
                    names.push(categoryTag)
                }
            }
        }
        console.log("Nouvelle liste de tags: ", tagAddedToMatch.category, names)

        const modifiedChoosenTags: ChoosenTag[] = Object.assign([], getState().choosenTags.filter(tags => tags.category != tagAddedToMatch.category))
        modifiedChoosenTags.push({ category: tagAddedToMatch.category, names: names })

        setState({
            ...getState(),
            choosenTags: modifiedChoosenTags
        })
    }

    @Action(AddScoreToPlayer)
    addScoreToPlayer({ setState, getState }: StateContext<MatchStateModel>, scoreAddedToPlayer: AddScoreToPlayer) {
        const player: Player | undefined = getState().players.find(p => p.id == scoreAddedToPlayer.playerId)
        if (player === undefined) {
            console.warn("Cannot add tag to player because player is undefined => ", scoreAddedToPlayer.playerId)
            return
        }

        const modifiedPlayerList: Player[] = getState().players.map(player => {
            if (player.id == scoreAddedToPlayer.playerId) {
                return { ...player, score: scoreAddedToPlayer.score }
            }
            return player
        })

        let winnigPlayer: Player | undefined = undefined
        if (modifiedPlayerList.filter(player => player.score == undefined).length == 0) {
            winnigPlayer = modifiedPlayerList.reduce((prev, current) => (prev.score! > current.score!) ? prev : current)
        }

        setState({
            ...getState(),
            players: modifiedPlayerList,
            winnigPlayer: winnigPlayer
        })
    }

    @Action(MatchEnded)
    matchEnded({ setState, getState }: StateContext<MatchStateModel>, matchEnded: MatchEnded) {
        setState({
            ...getState(),
            endedAt: matchEnded.endDate
        })
    }

    @Action(MatchAborted)
    matchAborted({ setState, getState }: StateContext<MatchStateModel>) {
        this.matchService.cancelMatch(getState().matchId, getState().endedAt!).subscribe((canceledMatch) => {
            console.log("Match canceled", canceledMatch)
            setState(defaultMatchModel)
        })

    }

    @Action(SaveMatchResult)
    saveMatchResult({ setState, getState }: StateContext<MatchStateModel>) {
        this.matchService.saveMatchResult(getState().matchId, getState().players, getState().endedAt!).subscribe((savedMatch) => {
            console.log("Match and scores saved", savedMatch)
            setState(defaultMatchModel)
        })
    }
}