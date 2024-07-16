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
import { Observable, forkJoin, mergeMap, switchMap } from 'rxjs'
import { MatchCrudService } from '../crud/match-crud.service'
import { MatchEntity } from '../../entity/match-entity.model'
import { MatchModel } from '../../model/match.model'
import { TeamCrudService } from '../crud/team-crud.service'

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
}