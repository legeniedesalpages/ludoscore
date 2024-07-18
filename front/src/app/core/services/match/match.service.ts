/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 05/02/2023 - 01:10:54
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 05/02/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core'
import { Observable, forkJoin, map, mergeMap, switchMap } from 'rxjs'
import { MatchCrudService } from '../crud/match-crud.service'
import { MatchEntity } from '../../entity/match-entity.model'
import { MatchModel, Team } from '../../model/match.model'
import { TeamCrudService } from '../crud/team-crud.service'
import { environment } from 'src/environments/environment'
import { ColorTag, NO_COLOR, Tag } from '../../model/tag.model'
import { ScoreTag } from '../../model/score.model'
import { DrawBreaker } from '../../model/game.model'

@Injectable({ providedIn: 'root' })
export class MatchService {

    constructor(private matchCrudService: MatchCrudService, private teamCrudService: TeamCrudService) {
    }

    public findRunningMatch(): Observable<MatchEntity> {
        return this.matchCrudService.findRunningMatch()
    }

    public createMatch(matchModel: MatchModel): Observable<MatchEntity> {
        const aggregatedMatchEntity = {
            match: {
                gameId: matchModel.game.id,
                canceled: false,
                running: true,
                tags: JSON.stringify(matchModel.choosenTags)
            },
            teams: matchModel.teams.map(team => ({
                color: team.color.name,
                tags: JSON.stringify(team.choosenTags),
                name: team.name,
                players: team.teamPlayers.map(teamPlayer => ({
                    playerId: teamPlayer.player.id
                }))
            }))
        }
        return this.matchCrudService.save(aggregatedMatchEntity as unknown as MatchEntity)
    }

    public cancelMatch(matchId: number, endedAt: Date): Observable<MatchEntity> {
        return this.matchCrudService.findOne(matchId).pipe(
            mergeMap((match) => {
                match.canceled = true
                match.running = false
                match.finishedAt = endedAt
                return this.matchCrudService.update(matchId, match)
            }))
    }

    public saveMatchResult(match: MatchModel): Observable<MatchEntity> {

        return forkJoin(match.teams.map(team => {
            console.debug("Saving team", team)

            return this.teamCrudService.update(team.id!, {
                id: team.id,
                name: team.name,
                color: team.color.name,
                matchId: match.matchId!,
                score: team.score,
                scoreDetails: JSON.stringify(team.scoreDetails),
                tags: JSON.stringify(team.choosenTags)
            })
        })).pipe(
            switchMap(_ => {
                return this.matchCrudService.update(match.matchId!, {
                    id: match.matchId,
                    gameId: match.game.id,
                    canceled: false,
                    running: false,
                    tags: JSON.stringify(match.choosenTags),
                    winnerTeamId: match.winnigTeam?.id,
                })
            })
        )
    }

    public getAllMatchesCount(): Observable<number> {
        return this.matchCrudService.findAllCount()
    }

    public getMatch(matchId: number): Observable<MatchModel> {
        return this.matchCrudService.findOne(matchId).pipe(map((matchEntity: any) => {
            return this.matchEntityToModel(matchEntity)
        }))
    }

    public getAllMatches(page: number, size: number): Observable<MatchModel[]> {
        return this.matchCrudService.findAllPaginated(page, size).pipe(map((matchEntities: any[]) => {
            return matchEntities.map((matchEntity: any) => {
                return this.matchEntityToModel(matchEntity)
            })
        }))
    }

    private matchEntityToModel(matchEntity: any): MatchModel {
        const matchModel: MatchModel = {
            matchId: matchEntity.idMatch,
            canceled: matchEntity.canceled,
            game: {
                id: matchEntity.gameId,
                title: matchEntity.title,
                imageUrl: environment.imagesURL + '/' + matchEntity.imageId,
                thumbnailUrl: environment.imagesURL + '/' + matchEntity.thumbnailId,
                isOnlyCooperative: matchEntity.isOnlyCooperative,
                minPlayers: matchEntity.minPlayers,
                maxPlayers: matchEntity.maxPlayers,
                ownershipDate: matchEntity.ownershipDate,
                matchTags: matchEntity.matchTags ? JSON.parse(matchEntity.matchTags) : [] as Tag[],
                playerTags: matchEntity.playerTags ? JSON.parse(matchEntity.playerTags) : [] as Tag[],
                playerColors: matchEntity.playerColors ? JSON.parse(matchEntity.playerColors) : [] as ColorTag[],
                scoreTags: matchEntity.scoreTemplate ? JSON.parse(matchEntity.scoreTemplate) : [] as ScoreTag[],
                bggId: matchEntity.bggId,
                drawAllowed: matchEntity.drawAllowed,
                drawBreaker: matchEntity.drawBreaker ? JSON.parse(matchEntity.drawBreaker) : [] as DrawBreaker[],
                quantifiableScore: matchEntity.quantifiableScore,
                highestScoreWin: matchEntity.highestScoreWin
            },
            choosenTags: matchEntity.tags ? JSON.parse(matchEntity.tags) : [] as Tag[],
            teams: matchEntity.teams?.map((teamEntity: any) => {
                const team: Team = {
                    id: teamEntity.id,
                    name: teamEntity.name,
                    choosenTags: teamEntity.tags ? JSON.parse(teamEntity.tags) : [] as Tag[],
                    color: NO_COLOR,
                    score: teamEntity.score,
                    scoreDetails: [],
                    teamPlayers: []
                }
                return team
            }),
            creating: matchEntity.createdAt ? false : true,
            endedAt: matchEntity.finishedAt,
            started: matchEntity.startedAt ? true : false,
            startedAt: matchEntity.startedAt,
            winnigTeam: matchEntity.winnerTeamId ? { 
                id: matchEntity.winnerTeamId,
                name: '',
                choosenTags: [],
                color: NO_COLOR,
                score: undefined,
                scoreDetails: [],
                teamPlayers: []
            } : undefined,
        }
        return matchModel
    }
}
