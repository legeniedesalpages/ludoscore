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
import { Observable, forkJoin, mergeMap } from 'rxjs'
import { MatchCrudService } from '../crud/match-crud.service'
import { MatchEntity } from '../../entity/match-entity.model'
import { MatchModel } from '../../model/match.model'

@Injectable({ providedIn: 'root' })
export class MatchService {

    constructor(private matchCrudService: MatchCrudService) {
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
        return this.matchCrudService.findOne(match.matchId!).pipe(
            mergeMap(matchEntity => {
                forkJoin(match.teams.map(team => this.matchCrudService.updateTeamScore(team)))
                matchEntity.canceled = false
                matchEntity.running = false
                matchEntity.finishedAt = match.endedAt
                return this.matchCrudService.update(match.matchId!, matchEntity)
            })
        )
    }
}