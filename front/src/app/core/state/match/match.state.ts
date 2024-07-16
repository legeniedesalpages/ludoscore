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
import { AddTeam, AddScoreToTeam, CancelMatchCreation, ChangeFirstTeam, ChangeTeamColor, CreateMatch, LaunchMatch, MatchAborted, MatchEnded, RemoveTeam, SaveMatchResult, SwapTeamPosition, UpdateTeamTags, UpdateGameTags, AddGameTags, RemoveGameTags } from "./match.action"
import { MatchService } from "../../services/match/match.service"
import { catchError, first, tap } from 'rxjs/operators'
import { ChoosenTag, MatchModel, Team, TeamPlayer } from "../../model/match.model"
import { MatchEntity } from "../../entity/match-entity.model"
import { forkJoin, lastValueFrom } from "rxjs"

const MATCH_STATE_TOKEN = new StateToken<MatchStateModel>('match')

export enum MatchStateEnum {
    CREATING,
    STARTED,
    FINISHED,
    NONE
}

const defaultMatchModel = {
    match: undefined
}

@State<MatchStateModel>({
    name: MATCH_STATE_TOKEN,
    defaults: defaultMatchModel
})
@Injectable()
export class MatchState {

    @Selector()
    static match(state: MatchStateModel): MatchModel {
        return state.match!
    }

    @Selector()
    static teams(state: MatchStateModel): Team[] {
        return state.match?.teams!
    }

    @Selector()
    static state(state: MatchStateModel): MatchStateEnum {
        if (state.match === undefined) {
            return MatchStateEnum.NONE
        }
        return state.match.creating ? MatchStateEnum.CREATING : state.match.started ? MatchStateEnum.STARTED : MatchStateEnum.FINISHED
    }

    constructor(private matchService: MatchService) { }

    /* MATCH */

    @Action(CreateMatch)
    createMatch({ setState, getState }: StateContext<MatchStateModel>, createMatch: CreateMatch) {

        if (getState().match !== undefined) {
            console.error("A match was already created, can't create a new match")
            return
        }

        console.info("Create match")
        setState({
            match: {
                game: createMatch.game,
                teams: [],
                started: false,
                creating: true,
                choosenTags: [],
            }
        })
    }

    @Action(LaunchMatch)
    launchMatch({ setState, getState }: StateContext<MatchStateModel>) {

        // TODO : check if all teams have players
        // TODO : check if match exists
        // TODO : check if match is not already started
        // TODO : check if match is not already ended
        // TODO : check if match is not already canceled
        // TODO : check if match has at least the minimum number of teams
        // TODO : check if match has not more teams than the maximum number of teams

        console.info("Launch match")
        return this.matchService.createMatch(getState().match!).pipe(tap(matchEntity => {

            let value: any = matchEntity["teams" as keyof MatchEntity];

            const newTeams: Team[] = []
            const teams = getState().match!.teams
            for (let i = 0; i < teams.length; i++) {

                const newTeamPlayers: TeamPlayer[] = []
                const teamPlayer = teams[i].teamPlayers
                for (let j = 0; j < teamPlayer.length; j++) {

                    newTeamPlayers.push({
                        ...teamPlayer[j],
                        id: value[i][1][j]
                    })
                }

                newTeams.push({
                    ...teams[i],
                    id: value[i][0],
                    teamPlayers: newTeamPlayers
                })
            }

            setState({
                match: {
                    ...getState().match!,
                    matchId: matchEntity.id,
                    started: true,
                    creating: false,
                    startedAt: matchEntity.startedAt,
                    teams: newTeams
                }
            })
        }))
    }

    @Action(CancelMatchCreation)
    cancelMatchCreation({ getState, setState }: StateContext<MatchStateModel>) {

        if (getState().match === undefined) {
            console.warn("No match to cancel")
            return
        }

        console.info("Cancel match creation")
        setState(defaultMatchModel)
    }

    @Action(MatchEnded)
    matchEnded({ setState, getState }: StateContext<MatchStateModel>, matchEnded: MatchEnded) {
        console.info("Ending match")
        setState({
            match: {
                ...getState().match!,
                endedAt: matchEnded.endDate,
                started: false
            }
        })
    }

    @Action(MatchAborted)
    matchAborted({ setState, getState }: StateContext<MatchStateModel>) {
        console.info("Aborting match")
        this.matchService.cancelMatch(getState().match!.matchId!, getState().match!.endedAt!).subscribe(_ => {
            setState(defaultMatchModel)
        })

    }

    @Action(SaveMatchResult)
    async saveMatchResult({ setState, getState }: StateContext<MatchStateModel>) {
        console.info("Saving match")
        const matchEntity: MatchEntity = await lastValueFrom(this.matchService.saveMatchResult(getState().match!).pipe(catchError(error => { console.warn(error.message); throw error.message })))
        console.debug("Match saved", matchEntity)
        setState(defaultMatchModel)
    }

    @Action(AddGameTags)
    addGameTags({ setState, getState }: StateContext<MatchStateModel>, addGameTags: AddGameTags) {

        const alreadyChoosenTags = getState().match!.choosenTags.find(tag => tag.category == addGameTags.category)
        if (alreadyChoosenTags == undefined) {
            console.info("Category not found, creating new one")
            setState({
                match: {
                    ...getState().match!,
                    choosenTags: [...getState().match!.choosenTags, { category: addGameTags.category, names: [addGameTags.name] }]
                }
            })
        } else {
            const names = alreadyChoosenTags.names.map(name => name)
            names[addGameTags.index] = addGameTags.name
            setState({
                match: {
                    ...getState().match!,
                    choosenTags: getState().match!.choosenTags.map(tag => tag.category == addGameTags.category ? { category: tag.category, names: names } : tag)
                }
            })
        }
    }

    @Action(RemoveGameTags)
    removeGameTags({ setState, getState }: StateContext<MatchStateModel>, removeGameTags: RemoveGameTags) {

        const alreadyChoosenTags = getState().match!.choosenTags.find(tag => tag.category == removeGameTags.category)!
        const modifiedNames = alreadyChoosenTags.names.map(name => name)
        modifiedNames[removeGameTags.index] = undefined!
        if (modifiedNames.find(name => name != undefined) == undefined) {
            setState({
                match: {
                    ...getState().match!,
                    choosenTags: getState().match!.choosenTags.filter(tag => tag.category != removeGameTags.category)
                }
            })
        } else {
            setState({
                match: {
                    ...getState().match!,
                    choosenTags: getState().match!.choosenTags.map(tag => tag.category == removeGameTags.category ? { category: tag.category, names: modifiedNames } : tag)
                }
            })
        }

    }


    /* TEAM */

    @Action(AddTeam)
    addTeam({ setState, getState }: StateContext<MatchStateModel>, addedTeam: AddTeam) {

        const newPlayersIds = addedTeam.team.teamPlayers.map(teamPlayer => teamPlayer.player.id)
        const existingPlayersIds = getState().match!.teams.flatMap(team => team.teamPlayers.map(teamPlayer => teamPlayer.player.id))

        if (newPlayersIds.some(playerId => existingPlayersIds.includes(playerId))) {
            console.warn("At least, a player in the new team already exist in antother team")
            return
        }

        console.info("Add team:", addedTeam.team.name)
        setState({
            match: {
                ...getState().match!,
                teams: [...getState().match!.teams, addedTeam.team]
            }
        })
    }

    @Action(ChangeFirstTeam)
    changeFirstTeam({ setState, getState }: StateContext<MatchStateModel>, firstTeam: ChangeFirstTeam) {
        console.info("Team order change: first team is now", firstTeam.team.name, "and was", getState().match!.teams[0].name, "before")
        if (!this.checkIntegrityOfTeam(getState(), firstTeam.team)) {
            return
        }

        const newlyOrderedTeams: Team[] = [firstTeam.team]
        getState().match!.teams.forEach(team => {
            if (team != firstTeam.team) {
                newlyOrderedTeams.push(team)
            }
        })

        setState({
            match: {
                ...getState().match!,
                teams: newlyOrderedTeams
            }
        })
    }

    @Action(ChangeTeamColor)
    changeTeamColor({ setState, getState }: StateContext<MatchStateModel>, changeColorEvent: ChangeTeamColor) {

        const oldColor = changeColorEvent.team.color
        const teamToChangeColor = changeColorEvent.team
        const newColor = changeColorEvent.color
        if (oldColor.name === newColor.name) {
            return
        }
        console.info("Changing color of team:", teamToChangeColor.name, "from", oldColor.name, "to", newColor.name)
        if (!this.checkIntegrityOfTeam(getState(), changeColorEvent.team)) {
            return
        }

        const modifiedTeamList: Team[] = getState().match!.teams.map(team => {
            if (team == teamToChangeColor) {
                return { ...team, color: newColor }
            } else if (team.color.name === newColor.name) {
                return { ...team, color: oldColor }
            } else {
                return team
            }
        })

        setState({
            match: {
                ...getState().match!,
                teams: modifiedTeamList
            }
        })
    }

    @Action(SwapTeamPosition)
    swapTeamPosition({ setState, getState }: StateContext<MatchStateModel>, teamsToSwap: SwapTeamPosition) {
        console.info("Team order swap:", teamsToSwap.firstTeam.name, "and", teamsToSwap.secondTeam.name)
        if (!this.checkIntegrityOfTeam(getState(), teamsToSwap.firstTeam) || !this.checkIntegrityOfTeam(getState(), teamsToSwap.secondTeam)) {
            return
        }

        let newlyOrderedTeams: Team[] = []

        getState().match!.teams.forEach(team => {
            if (team == teamsToSwap.firstTeam) {
                newlyOrderedTeams.push(teamsToSwap.secondTeam)
            } else if (team == teamsToSwap.secondTeam) {
                newlyOrderedTeams.push(teamsToSwap.firstTeam)
            } else {
                newlyOrderedTeams.push(team)
            }
        })

        setState({
            match: {
                ...getState().match!,
                teams: newlyOrderedTeams
            }
        })
    }

    @Action(RemoveTeam)
    removeTeam({ setState, getState }: StateContext<MatchStateModel>, removedTeam: RemoveTeam) {

        console.info("Remove Team:", removedTeam.team.name)
        if (!this.checkIntegrityOfTeam(getState(), removedTeam.team)) {
            return
        }

        setState({
            match: {
                ...getState().match!,
                teams: getState().match!.teams.filter(team => team != removedTeam.team)
            }
        })
    }

    @Action(UpdateTeamTags)
    addTagToTeam({ setState, getState }: StateContext<MatchStateModel>, updateTeamTags: UpdateTeamTags) {

        console.info("Update tags of team:", updateTeamTags.team.name)
        if (!this.checkIntegrityOfTeam(getState(), updateTeamTags.team)) {
            return
        }

        let modifiedChoosenTags = this.up(updateTeamTags.team.choosenTags, updateTeamTags.tagsToAdd, updateTeamTags.tagsToRemove)

        const modifiedTeamList: Team[] = getState().match!.teams.map(team => {
            if (team != updateTeamTags.team) {
                return team
            }
            return { ...team, choosenTags: modifiedChoosenTags }
        })

        setState({
            match: {
                ...getState().match!,
                teams: modifiedTeamList
            }
        })
    }

    @Action(UpdateGameTags)
    updateGameTags({ setState, getState }: StateContext<MatchStateModel>, updateGameTags: UpdateGameTags) {
        console.info("Update tags of game")

        let modifiedChoosenTags = this.up(getState().match!.choosenTags, updateGameTags.tagsToAdd, updateGameTags.tagsToRemove)

        setState({
            match: {
                ...getState().match!,
                choosenTags: modifiedChoosenTags
            }
        })
    }

    private up(modifiedChoosenTags: ChoosenTag[], tagsToAdd: [category: string, name: string, index: number][], tagsToRemove: [category: string, index: number][]): ChoosenTag[] {

        tagsToAdd.forEach(tag => {
            const category = tag[0]
            const choosenCategoryTagName = modifiedChoosenTags.find(tags => tags.category == category)?.names
            const names = this.createNewNameListForCategory(category, tag[1], tag[2], choosenCategoryTagName)
            modifiedChoosenTags = Object.assign([], modifiedChoosenTags.filter(tags => tags.category != category))
            modifiedChoosenTags.push({ category: category, names: names })
        })
        tagsToRemove.forEach(tag => {
            const category = tag[0]
            const names = modifiedChoosenTags.find(tags => tags.category == category)?.names
            if (names != undefined) {
                const choosenCategoryTagName = names.map(name => name)
                choosenCategoryTagName?.splice(tag[1], 1, undefined!)
                modifiedChoosenTags = Object.assign([], modifiedChoosenTags.filter(tags => tags.category != category))
                if (choosenCategoryTagName.find(name => name != undefined)) {
                    modifiedChoosenTags.push({ category: category, names: choosenCategoryTagName })
                }
            }
        })

        return modifiedChoosenTags
    }

    private createNewNameListForCategory(category: string, name: string, index: number, choosenCategoryTagName?: string[]): string[] {
        let names: string[] = []
        if (choosenCategoryTagName == undefined) {
            names = []
        } else {
            names = Object.assign([], choosenCategoryTagName)
        }
        names[index] = name
        console.debug("For category", category, ", new tag list:", names)
        return names
    }

    @Action(AddScoreToTeam)
    addScoreToTeam({ setState, getState }: StateContext<MatchStateModel>, scoreAddedToTeam: AddScoreToTeam) {

        console.info("Adding score to player")
        if (!this.checkIntegrityOfTeam(getState(), scoreAddedToTeam.team)) {
            return
        }

        const modifiedTeamList: Team[] = getState().match!.teams.map(team => {
            if (team == scoreAddedToTeam.team) {
                return { 
                    ...team,
                    score: scoreAddedToTeam.score,
                    scoreDetails: scoreAddedToTeam.scoreDetail
                }
            }
            return team
        })

        let winnigTeam: Team | undefined = undefined
        if (modifiedTeamList.filter(team => team.score == undefined).length == 0) {
            winnigTeam = modifiedTeamList.reduce((previous, current) => (previous.score! > current.score!) ? previous : current)
        }

        setState({
            match: {
                ...getState().match!,
                teams: modifiedTeamList,
                winnigTeam: winnigTeam
            }
        })
    }

    private checkIntegrityOfTeam(state: MatchStateModel, teamToCheck: Team): boolean {
        const team: Team | undefined = state.match?.teams.find(team => team === teamToCheck)
        if (team === undefined) {
            console.error("Cannot perform task because team is not found")
            return false
        }
        return true;
    }
}