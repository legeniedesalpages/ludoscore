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
import { GameSearchResult } from '../model/game-search.model';

@Injectable()
export class FindGameService {

    private readonly gameSearchUrl = environment.apiURL + '/api/game_search';

    public items: GameSearchResult[];
    public searchString: string;

    constructor(private http: HttpClient) {
        this.searchString = '';
        this.items = [];
    }

    public search(searchString: string): Observable<GameSearchResult[]> {
        this.searchString = searchString;
        return this.http.get<GameSearchResult[]>(this.gameSearchUrl, { params: { q: searchString } }).pipe(
            tap(gameResult => this.items = gameResult),
            catchError(error => {
                this.items = []
                throw new Error(error)
            })
        );
    }

    public resetPreviousSearch() {
        this.searchString = '';
        this.items = [];
    }

}
