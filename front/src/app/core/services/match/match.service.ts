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
import { Injectable, inject } from '@angular/core'
import { Observable, catchError, forkJoin, map, mergeMap, of, switchMap } from 'rxjs'
import { MatchCrudService } from '../crud/match-crud.service'
import { MatchEntity } from '../../entity/match-entity.model'
import { MatchModel, Team } from '../../model/match.model'
import { TeamCrudService } from '../crud/team-crud.service'
import { environment } from 'src/environments/environment'
import { COLORS, ColorTag, NO_COLOR, Tag } from '../../model/tag.model'
import { Score, ScoreTag } from '../../model/score.model'
import { DrawBreaker } from '../../model/game.model'
import { GeolocationService, Position } from '../misc/geolocation.service'

// Dates au format serveur "YYYY-MM-DD HH:mm:ss" ; finishedAt peut être nul (durée non déterminée)
export interface MatchHistoryUpdate {
    matchId: number
    startedAt: string
    finishedAt: string | null
    winnerTeamId: number | null
    running: boolean
    canceled: boolean
    teams: { id: number, score: number | null, scoreDetails: Score[] }[]
}

@Injectable({ providedIn: 'root' })
export class MatchService {

    private geolocationService = inject(GeolocationService)

    constructor(private matchCrudService: MatchCrudService, private teamCrudService: TeamCrudService) {
    }

    public uploadMatchPhoto(matchId: number, photo: Blob): Observable<void> {
        return this.matchCrudService.uploadPhoto(matchId, photo)
    }

    public deleteMatchPhoto(matchId: number): Observable<void> {
        return this.matchCrudService.deletePhoto(matchId)
    }

    public getMatchPhoto(matchId: number): Observable<Blob | null> {
        return this.matchCrudService.getPhoto(matchId)
    }

    public findRunningMatch(): Observable<MatchEntity> {
        return this.matchCrudService.findRunningMatch()
    }

    // Couleur du joueur lors de la dernière partie du jeu (avec les mêmes autres joueurs si précisés)
    public findPreviousTeamColor(gameId: number, playerId: number, withPlayerIds: number[]): Observable<string | null> {
        return this.matchCrudService.getPreviousTeamColor(gameId, playerId, withPlayerIds).pipe(
            map(result => result.color ?? null),
            catchError(() => of(null))
        )
    }

    public deleteMatch(matchId: number): Observable<void> {
        return this.matchCrudService.delete(matchId).pipe(map(_ => { }))
    }

    public createMatch(matchModel: MatchModel): Observable<MatchEntity> {
        return this.geolocationService.currentPosition().pipe(
            switchMap(position => this.saveNewMatch(matchModel, position))
        )
    }

    private saveNewMatch(matchModel: MatchModel, position: Position | null): Observable<MatchEntity> {
        const aggregatedMatchEntity = {
            match: {
                gameId: matchModel.game.id,
                canceled: false,
                running: true,
                tags: JSON.stringify(matchModel.choosenTags),
                latitude: position?.latitude ?? null,
                longitude: position?.longitude ?? null
            },
            teams: matchModel.teams.map(team => ({
                color: team.color.name,
                tags: JSON.stringify(team.choosenTags),
                name: team.teamPlayers.length === 1 && team.name === team.teamPlayers[0].player.pseudo
                    ? team.teamPlayers[0].player.creatorPseudo ?? team.name : team.name,
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
                    winnerTeamId: match.winningTeam?.id,
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

    // Les équipes ne sont pas converties en camelCase par l'API : on accepte les deux écritures
    private parseScoreDetails(raw: unknown): Score[] {
        if (!raw) {
            return []
        }
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    public updateMatchHistory(match: MatchHistoryUpdate): Observable<void> {
        return this.matchCrudService.updateHistory(match.matchId, {
            started_at: match.startedAt,
            finished_at: match.finishedAt,
            winner_team_id: match.winnerTeamId,
            running: match.running,
            canceled: match.canceled,
            teams: match.teams.map(team => ({
                id: team.id,
                score: team.score,
                score_details: team.scoreDetails
            }))
        })
    }

    private matchEntityToModel(matchEntity: any): MatchModel {
        const matchModel: MatchModel = {
            matchId: matchEntity.idMatch,
            canceled: matchEntity.canceled,
            running: !!matchEntity.running,
            game: {
                id: matchEntity.gameId,
                title: matchEntity.title,
                imageUrl: environment.imagesURL + '/' + matchEntity.imageId,
                thumbnailUrl: environment.imagesURL + '/' + matchEntity.thumbnailId,
                isOnlyCooperative: matchEntity.isOnlyCooperative,
                minPlayers: matchEntity.minPlayers,
                maxPlayers: matchEntity.maxPlayers,
                ownershipDate: matchEntity.ownershipDate,
                inLibrary: !!Number(matchEntity.inLibrary),
                matchTags: matchEntity.matchTags ? JSON.parse(matchEntity.matchTags) : [] as Tag[],
                playerTags: matchEntity.playerTags ? JSON.parse(matchEntity.playerTags) : [] as Tag[],
                playerColors: matchEntity.playerColors ? JSON.parse(matchEntity.playerColors) : [] as ColorTag[],
                scoreTags: matchEntity.scoreTemplate ? JSON.parse(matchEntity.scoreTemplate) : [] as ScoreTag[],
                bggId: matchEntity.bggId,
                drawAllowed: matchEntity.drawAllowed,
                drawBreaker: matchEntity.drawBreaker ? JSON.parse(matchEntity.drawBreaker) : [] as DrawBreaker[],
                quantifiableScore: matchEntity.quantifiableScore,
                highestScoreWin: matchEntity.highestScoreWin,
                estimatedDurationInMinutes: matchEntity.estimatedDurationInMinutes
            },
            choosenTags: matchEntity.tags ? JSON.parse(matchEntity.tags) : [] as Tag[],
            teams: matchEntity.teams?.map((teamEntity: any) => {
                const team: Team = {
                    id: teamEntity.id,
                    name: teamEntity.name,
                    displayName: teamEntity.displayName ?? teamEntity.display_name,
                    creatorPseudo: teamEntity.creatorPseudo ?? teamEntity.creator_pseudo,
                    choosenTags: teamEntity.tags ? JSON.parse(teamEntity.tags) : [] as Tag[],
                    color: COLORS.find(color => color.name === teamEntity.color) ?? NO_COLOR,
                    score: teamEntity.score,
                    scoreDetails: this.parseScoreDetails(teamEntity.scoreDetails ?? teamEntity.score_details),
                    teamPlayers: []
                }
                return team
            }),
            creating: matchEntity.createdAt ? false : true,
            endedAt: matchEntity.finishedAt,
            started: matchEntity.startedAt ? true : false,
            startedAt: matchEntity.startedAt,
            winningTeam: matchEntity.winnerTeamId ? { 
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
