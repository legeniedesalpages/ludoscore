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
import { tap, catchError } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GameSearchResult } from '../../model/game-search.model';
import { GameSearchDetail } from '../../model/game-search-detail.model';


@Injectable()
export class FindGameService {

    private readonly gameSearchUrl = environment.apiURL + '/api/game_search';
    private readonly gameSearchDetailUrl = environment.apiURL + '/api/game_search_detail';

    public searchedGames: GameSearchResult[];
    public searchString: string;
    public currentSearchedGame: GameSearchDetail | undefined;

    constructor(private http: HttpClient) {
        this.searchString = '';
        this.searchedGames = [];
    }

    public search(searchString: string): Observable<GameSearchResult[]> {
        this.searchString = encodeURIComponent(searchString);
        return this.http.get<GameSearchResult[]>(this.gameSearchUrl, { params: { q: searchString } }).pipe(
            tap(gameResult => this.searchedGames = gameResult),
            catchError(error => {
                this.searchedGames = []
                throw new Error(error)
            })
        );
    }

    public detail(bggId: number): Observable<GameSearchDetail> {
        return this.http.get<GameSearchDetail>(this.gameSearchDetailUrl,
            { params: { id: bggId } }).pipe(
                tap(gameResult => this.currentSearchedGame = gameResult),
                catchError(error => {
                    this.currentSearchedGame = undefined
                    throw new Error(error)
                })
            );
    }

    public resetPreviousSearch() {
        this.searchString = '';
        this.searchedGames = [];
        this.currentSearchedGame = undefined
    }
}
