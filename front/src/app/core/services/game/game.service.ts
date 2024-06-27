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
import moment from 'moment';
import { Game } from '../../model/game.model';
import { Tag } from '../../model/tag.model';
import { ColorTag } from '../../model/color-tag.model';

@Injectable()
export class GameService {

    public searchedGames: Game[];

    private readonly gameUrl = environment.apiURL + '/api/game';

    constructor(private http: HttpClient) {
        this.searchedGames = []
    }

    public save(game: Game): Observable<Game> {

        let formOwnershipDate = game.ownershipDate ? moment(game.ownershipDate).format('YYYY-MM-DD') : null;

        return this.http.post<Game>(this.gameUrl, {
            name: game.title,
            image_id: game.imageId,
            thumbnail_id: game.thumbnailId,
            isOnlyCooperative: game.isOnlyCooperative,
            minPlayers: game.minPlayers,
            maxPlayers: game.maxPlayers,
            ownershipDate: formOwnershipDate,
            matchTags: JSON.stringify(game.matchTags),
            playerTags: JSON.stringify(game.playerTags),
            playerColors: JSON.stringify(game.playerColors),
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
                    x.thumbnailId = environment.imagesURL + '/' + x.thumbnailId
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
                game.thumbnailId = environment.imagesURL + '/' + game.thumbnailId
                game.imageId = environment.imagesURL + '/' + game.imageId
                return game;
            }),
            catchError(error => {
                throw new Error(error)
            })
        );
    }

    public getFromBgg(bggId: number): Observable<Game> {
        return this.http.get<Game>(this.gameUrl + "/bgg/" + bggId).pipe(
            tap(game => {
                console.log(game)
                game.thumbnailId = environment.imagesURL + '/' + game.thumbnailId
                game.imageId = environment.imagesURL + '/' + game.imageId
                
                if (game.matchTags != null) {
                    game.matchTags = JSON.parse(game.matchTags.toString())
                } else {
                    game.matchTags = [] as Tag[];
                }

                if (game.playerTags != null) {
                    game.playerTags = JSON.parse(game.playerTags.toString())
                } else {
                    game.playerTags = [] as Tag[];
                }

                if (game.playerColors != null) {
                    game.playerColors = JSON.parse(game.playerColors.toString())
                } else {
                    game.playerColors = [] as ColorTag[];
                }

                return game;
            }),
            catchError(error => {
                throw new Error(error)
            })
        );
    }
}
