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
import { MatchEntity, MatchTeamPlayerEntity } from '../../entity/match-entity.model'
import { Observable, map, tap } from 'rxjs'


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

    getPreviousTeamColor(gameId: number, playerId: number, withPlayerIds: number[]): Observable<{ color: string | null }> {
        const url = `${this.apiUrl}/previous-team-color/${gameId}/${playerId}`
        return this.http.get<{ color: string | null }>(url, { params: { with: withPlayerIds.join(',') } })
    }

    uploadPhoto(matchId: number, photo: Blob): Observable<void> {
        const formData = new FormData()
        formData.append('photo', photo, 'photo.jpg')
        return this.http.post<void>(`${this.apiUrl}${this.base}/${matchId}/photo`, formData)
    }

    deletePhoto(matchId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}${this.base}/${matchId}/photo`)
    }

    getPhoto(matchId: number): Observable<Blob | null> {
        return this.http.get(`${this.apiUrl}${this.base}/${matchId}/photo`, { responseType: 'blob' })
            .pipe(map(blob => blob && blob.size > 0 ? blob : null))
    }

    updateHistory(matchId: number, payload: unknown): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}${this.base}/${matchId}/history`, payload)
    }

    generateStory(matchId: number): Observable<{ story: string }> {
        return this.http.post<{ story: string }>(`${this.apiUrl}${this.base}/${matchId}/story`, {})
    }

    findAllCount(): Observable<number> {
        var url = `${this.apiUrl}/game-match-count`
        return this.http.get<number>(url).pipe(tap(res => console.debug("find all count " + url + " => ", res)))
    }
}