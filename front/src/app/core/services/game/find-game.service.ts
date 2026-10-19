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
import { GameSearchDetail, GameSearchResult, GameSearchRow, GameSearchType } from '../../model/game-search.model'


@Injectable({ providedIn: 'root' })
export class FindGameService {

    public searchString: string = ''
    public searchType: GameSearchType = 'game'
    public searchResult: GameSearchResult[] = []
    public searchRows: GameSearchRow[] = []

    constructor(private http: HttpClient) {
    }

    public search(): Observable<void> {
        const params = { q: this.searchString, type: this.searchType }
        return this.http.get<GameSearchResult[]>(environment.apiURL + '/api/game_search', { params }).pipe(
            tap(result => {
                this.searchResult = result
                this.searchRows = FindGameService.toRows(result)
            }),
            map(_ => {})
        )
    }

    public resetSearch(): void {
        this.searchString = ''
        this.searchType = 'game'
        this.searchResult = []
        this.searchRows = []
    }

    public static toRows(results: GameSearchResult[]): GameSearchRow[] {
        return results.flatMap(result => {
            const rows: GameSearchRow[] = [
                { kind: 'item', result, level: 0 },
                ...(result.expansions ?? []).map(expansion => ({ kind: 'item' as const, result: expansion, level: 1 as const }))
            ]
            if (result.hiddenExpansionCount) {
                rows.push({ kind: 'hidden-expansions', count: result.hiddenExpansionCount })
            }
            return rows
        })
    }

    public detail(bggId: number): Observable<GameSearchDetail> {
        return this.http.get<GameSearchDetail>(environment.apiURL + '/api/game_search_detail', { params: { id: bggId } })
    }
}
