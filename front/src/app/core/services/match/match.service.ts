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
import { Observable, forkJoin, mergeMap,  tap } from 'rxjs'
import { MatchCrudService } from '../crud/match-crud.service'
import { MatchEntity, MatchTeamPlayerEntity } from '../../entity/match-entity.model'
import { MatchModel } from '../../model/match.model'

@Injectable({ providedIn: 'root' })
export class MatchService {

    constructor(private matchCrudService: MatchCrudService) {
    }

    public findRunningMatch(): Observable<MatchEntity> {
        return this.matchCrudService.findRunningMatch().pipe(tap(console.log))
    }

    public createMatch(match: MatchModel): Observable<MatchEntity> {
        const matchEntity: MatchEntity = {
            gameId: match.game.id,
            startedAt: undefined,
            finishedAt: undefined,
            canceled: false,
            running: true,
            winnerTeamId: undefined,
            drawBreaker: undefined,
            cancelReason: undefined,
            tags: JSON.stringify(match.choosenTags)
        }
        return this.matchCrudService.save(matchEntity)
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