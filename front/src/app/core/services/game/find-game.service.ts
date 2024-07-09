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

    constructor(private http: HttpClient) {
    }

    public search(searchString: string): Observable<GameSearchResult[]> {
        return this.http.get<GameSearchResult[]>(this.gameSearchUrl, { params: { q: searchString } });
    }

    public detail(bggId: number): Observable<GameSearchDetail> {
        return this.http.get<GameSearchDetail>(this.gameSearchDetailUrl,
            { params: { id: bggId } }).pipe(
                catchError(error => {
                    throw new Error(error)
                })
            );
    }
}
