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
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { map, Observable, tap } from 'rxjs'
import { environment } from 'src/environments/environment'
import { GameSearchResult, GameSearchDetail } from '../../model/game-search.model'


@Injectable({ providedIn: 'root' })
export class FindGameService {

    public searchString: string = ''
    public searchResult: GameSearchResult[] = []

    constructor(private http: HttpClient) {
    }

    public search(searchString: string): Observable<void> {
        this.searchString = searchString
        return this.http.get<GameSearchResult[]>(environment.apiURL + '/api/game_search', { params: { q: this.searchString } }).pipe(
            tap((result: GameSearchResult[]) => {
                this.searchResult = result
            }), 
            map(_ => {})
        )
    }

    public resetSearch(): void {
        this.searchString = ''
        this.searchResult = []
    }

    public detail(bggId: number): Observable<GameSearchDetail> {
        return this.http.get<GameSearchDetail>(environment.apiURL + '/api/game_search_detail', { params: { id: bggId } })
    }
}
