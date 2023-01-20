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
import { Observable, map, } from 'rxjs';
import { User } from '../model/user.model';

interface UserFromApi {
    id: number,
    name: string,
    email: string
}

@Injectable()
export class UserService {

    private readonly userUrl = environment.apiURL + '/api/users';
    private readonly userByPlayerUrl = environment.apiURL + '/api/users/player';

    constructor(private http: HttpClient) {
    }

    public list(): Observable<User[]> {
        return this.http.get<UserFromApi[]>(this.userUrl).pipe(
            map(users => users.map(user => this.userFromApiToUser(user)))
        )
    }

    public get(id: number): Observable<User> {
        return this.http.get<UserFromApi>(this.userUrl + '/' + id).pipe(
            map(player => this.userFromApiToUser(player))
        )
    }

    public getFromPlayerId(playerId: number): Observable<User> {
        return this.http.get<UserFromApi>(this.userByPlayerUrl + '/' + playerId).pipe(
            map(player => this.userFromApiToUser(player))
        )
    }

    private userFromApiToUser(userFromApi: UserFromApi): User {
        console.log(userFromApi)
        return {
            id: userFromApi.id,
            name: userFromApi.name,
            email: userFromApi.email
        }
    }
}
