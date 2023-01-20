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
import { Observable, map, tap } from 'rxjs';
import { Player } from '../model/player.model';
import { User } from '../model/user.model';

interface PlayerFromApi {
    id: number,
    pseudo: string,
    last_name: string,
    first_name: string,
    initials: string,
    prefered_color: string,
    gravatar: string
}

interface PlayerToSave {
    pseudo: string,
    last_name: string,
    first_name: string,
    initials: string,
    prefered_color: string,
    gravatar: string,
    user_id: number | null
}

@Injectable()
export class PlayerService {

    private readonly playerUrl = environment.apiURL + '/api/player';

    constructor(private http: HttpClient) {
    }

    public list(): Observable<Player[]> {
        return this.http.get<PlayerFromApi[]>(this.playerUrl).pipe(
            map(players => players.map(player => this.playerFromApiToPlayer(player)))
        )
    }

    public get(id: number): Observable<Player> {
        return this.http.get<PlayerFromApi>(this.playerUrl + "/" + id).pipe(
            map(player => this.playerFromApiToPlayer(player))
        )
    }

    public save(player: Player, user: User | null): Observable<number> {
        if (player.id == null) {
            return this.http.post<PlayerFromApi>(this.playerUrl, this.playerToPlayerFromApi(player, user)).pipe(
                map(player => player == null ? 0 : player.id)
            )
        } else {
            return this.http.patch<PlayerFromApi>(this.playerUrl + '/' + player.id, this.playerToPlayerFromApi(player, user)).pipe(
                map(player => player == null ? 0 : player.id)
            )
        }
    }

    private playerFromApiToPlayer(playerFromApi: PlayerFromApi): Player {
        console.log(playerFromApi)
        return {
            id: playerFromApi.id,
            pseudo: playerFromApi.pseudo,
            lastName: playerFromApi.last_name,
            firstName: playerFromApi.first_name,
            initials: playerFromApi.initials,
            preferedColor: playerFromApi.prefered_color,
            gravatar: playerFromApi.gravatar
        }
    }

    private playerToPlayerFromApi(player: Player, user: User | null): PlayerToSave {
        return {
            pseudo: player.pseudo,
            last_name: player.lastName,
            first_name: player.firstName,
            initials: player.initials,
            gravatar: player.gravatar == null ? "" : player.gravatar,
            prefered_color: player.preferedColor,
            user_id: user == null ? null : user.id
        }
    }
}
