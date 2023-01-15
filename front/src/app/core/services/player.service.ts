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
import { Observable, tap } from 'rxjs';
import { Player } from '../model/player.model';

@Injectable()
export class PlayerService {

    private readonly playerUrl = environment.apiURL + '/api/player';

    constructor(private http: HttpClient) {
    }

    public list(): Observable<Player[]> {
        return this.http.get<Player[]>(this.playerUrl).pipe(
            tap(players => {
                console.log("Players", players)
            })
        );
    }
}
