/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/12/2022 - 11:27:36
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { CollectionViewer, DataSource } from '@angular/cdk/collections'
import { CdkScrollableModule, ScrollingModule } from '@angular/cdk/scrolling'
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { BehaviorSubject, map, Observable, Subscription, tap } from 'rxjs'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchService } from 'src/app/core/services/match/match.service'
import { MatchFormatterService } from 'src/app/core/services/match/match-formatter.service'
import { LayoutModule } from '../../layout/layout.module'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'

@Component({
  templateUrl: './match-history.component.html',
  styleUrls: ['./match-history.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatProgressSpinnerModule,
    ScrollingModule, CdkScrollableModule,
    LayoutModule, LoadingSpinnerModule
  ]
})
export class MatchHistoryComponent {

  private store = inject(Store)
  private matchService = inject(MatchService)
  public formatter = inject(MatchFormatterService)

  public loading: boolean = true
  public dataSource!: Observable<MatchDataSource>
  public pageSize: number = 20

  constructor() {
    this.dataSource = this.matchService.getAllMatchesCount().pipe(
      tap(_ => this.loading = false),
      map(count => new MatchDataSource(this.matchService, this.pageSize, count))
    )
  }

  public line(match: MatchModel): string {
    return this.formatter.line(match) + '<br/>' + this.formatter.teamLine(match);
  }

  /**
   * @deprecated Use formatter.elapsedTime instead
   */
  private elapsedTime(startDate: Date, endDate: Date): string {
    return this.formatter.elapsedTime(startDate, endDate);
  }

  public goToHistoryDetail(match: MatchModel | undefined) {
    if (!match) {
      return
    }
    this.store.dispatch(new Navigate(['/match-history-detail', match.matchId]))
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }

  public trackByMatchId(index: number, match: MatchModel | undefined): number | undefined {
    return match?.matchId;
  }
}

export class MatchDataSource extends DataSource<MatchModel | undefined> {
  private _cachedData = Array.from<MatchModel>({ length: this._length })
  private _fetchedPages = new Set<number>()
  private readonly _dataStream = new BehaviorSubject<(MatchModel | undefined)[]>(this._cachedData)
  private readonly _subscription = new Subscription()

  constructor(private matchService: MatchService, private _pageSize: number, private _length: number) {
    super()
  }

  connect(collectionViewer: CollectionViewer): Observable<(MatchModel | undefined)[]> {
    this._subscription.add(
      collectionViewer.viewChange.subscribe(range => {
        const startPage = this._getPageForIndex(range.start)
        const endPage = this._getPageForIndex(range.end - 1)
        for (let i = startPage; i <= endPage; i++) {
          this._fetchPage(i)
        }
      }),
    )
    return this._dataStream
  }

  disconnect(): void {
    this._subscription.unsubscribe()
  }

  private _getPageForIndex(index: number): number {
    return Math.floor(index / this._pageSize)
  }

  private _fetchPage(page: number) {
    if (this._fetchedPages.has(page)) {
      return
    }
    this._fetchedPages.add(page)

    this.matchService.getAllMatches(page, this._pageSize).subscribe(entities => {
      this._cachedData.splice(
        page * this._pageSize,
        this._pageSize,
        ...entities
      )
      this._dataStream.next(this._cachedData)
    })
  }
}
