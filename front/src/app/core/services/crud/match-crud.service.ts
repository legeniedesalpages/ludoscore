/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 09/01/2023 - 00:34:56
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 09/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { MatchEntity } from '../../entity/match.entity';


@Injectable()
export class MatchCrudService {

    private readonly matchUrl = environment.apiURL + '/api/match';

    constructor(private http: HttpClient) {
    }

    public get(matchId: number): Observable<MatchEntity> {
        return this.http.get<MatchEntity>(this.matchUrl + '/' + matchId).pipe(
            tap(match => {
                console.debug("Matchi: ", match)
            })
        )
    }
}