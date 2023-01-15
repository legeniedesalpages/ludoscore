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
import { Observable, map, tap, catchError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Game } from '../model/game.model';
import moment from 'moment';

@Injectable()
export class GameService {

    public searchedGames: Game[];

    private readonly gameUrl = environment.apiURL + '/api/games';

    constructor(private http: HttpClient) {
        this.searchedGames = []
    }

    public save(game: Game): Observable<Game> {

        let formOwnershipDate = game.ownershipDate ? moment(game.ownershipDate).format('YYYY-MM-DD') : null;

        return this.http.post<Game>(this.gameUrl, {
            name: game.title,
            image_id: game.image_id,
            thumbnail_id: game.thumbnail_id,
            isOnlyCooperative: game.isOnlyCooperative,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            ownershipDate: formOwnershipDate,
            matchTags: JSON.stringify(game.matchTags),
            playerTags: JSON.stringify(game.playerTags),
            playerColors: JSON.stringify(game.playerColors.map(c => c.code)),
            bggId: game.bggId,
        }).pipe(
            map(res => {
                game.id = res.id
                return game
            })
        );
    }

    public list(): Observable<Game[]> {
        return this.http.get<Game[]>(this.gameUrl).pipe(
            tap(games => {
                let modifiedGames = games.map(x => {
                    x.thumbnail_id = environment.imagesURL + '/' + x.thumbnail_id
                    return x;
                })
                console.log(modifiedGames)
                this.searchedGames = modifiedGames
            }),
            catchError(error => {
                this.searchedGames = []
                throw new Error(error)
            })
        );
    }

    public get(gameId: number): Observable<Game> {
        return this.http.get<Game>(this.gameUrl + "/" + gameId).pipe(
            tap(game => {
                console.log(game)
                game.thumbnail_id = environment.imagesURL + '/' + game.thumbnail_id
                game.image_id = environment.imagesURL + '/' + game.image_id
                return game;
            }),
            catchError(error => {
                throw new Error(error)
            })
        );
    }
}
