/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 22/01/2023 - 17:41:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { CrudService } from './abstract-crud.service'
import { MatchEntity, MatchTeamEntity, MatchTeamPlayerEntity } from '../../entity/match-entity.model'
import { Observable, tap } from 'rxjs'
import { Team } from '../../model/match.model'

@Injectable({ providedIn: 'root' })
export class MatchCrudService extends CrudService<MatchEntity, number> {

    constructor(protected override http: HttpClient) {
        super(http, '/game-match')
    }

    findRunningMatch(): Observable<MatchEntity> {
        var url = `${this.apiUrl}/running-match`
        return this.http.get<MatchEntity>(url).pipe(tap(res => console.debug("find running " + url + " => ", res)))
    }

    getPreviousMatchOfPlayer(playerId: number, gameId: number): Observable<MatchTeamPlayerEntity> {
        var url = `${this.apiUrl}/previous-match/${playerId}/${gameId}`
        return this.http.get<MatchTeamPlayerEntity>(url).pipe(tap(res => console.debug("get previous match " + url + " => ", res)))
    }

    updateTeamScore(team: Team): Observable<MatchTeamEntity> {
        var url = `${this.apiUrl}/game-match/update-score`
        return this.http.put<MatchTeamEntity>(url, team).pipe(tap(res => console.debug("update player score " + url + " => ", res)))
    }

}