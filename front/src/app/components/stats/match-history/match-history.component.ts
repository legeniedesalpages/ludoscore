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
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { BehaviorSubject, map, Observable, Subscription, tap } from 'rxjs'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchService } from 'src/app/core/services/match/match.service'
import { DatePipe } from '@angular/common'
import { CollectionViewer, DataSource } from '@angular/cdk/collections'

@Component({
  templateUrl: './match-history.component.html',
  styleUrls: ['./match-history.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchHistoryComponent implements OnInit {

  public loading: boolean = true
  public ds!: Observable<MatchDataSource>
  public pageSize: number = 10

  constructor(private store: Store, private matchService: MatchService, private datePipe: DatePipe) {
    this.ds = this.matchService.getAllMatchesCount().pipe(
      tap(_ => this.loading = false), 
      map(count => new MatchDataSource(this.matchService, this.pageSize, count))
    )
  }

  ngOnInit(): void {
  }

  public line(match: MatchModel): string {

    let headline: string
    if (match.canceled) {
      headline = "<span class='accent'>Annulé</span> le " + this.datePipe.transform(match.endedAt, 'dd/MM/yyyy') + ' à ' + this.datePipe.transform(match.endedAt, 'HH:mm')
    } else if (!match.endedAt) {
      headline = "<span class='emphase'>En cours</span> depuis " + this.elapsedTime(match.startedAt!, new Date())
    } else {
      headline = "Joué le " + this.datePipe.transform(match.endedAt, 'dd/MM/yyyy') + ' en ' + this.elapsedTime(match.startedAt!, new Date(match.endedAt))
    }

    headline += "<br/>Avecqsdqsdqqsdqsdqsdqsdqsdqsdqsdqsdqsqsd: "
    headline += match.teams.map(team => team.id == match.winnigTeam?.id ? '<b>' + team.name + '</b>' : team.name ).join(', ')
    headline += ""

    return headline
  }

  public elapsedTime(startDate: Date, endDate: Date) {
      let t = endDate.getTime() - new Date(startDate).getTime()
      let minutes = "" + Math.floor((t / (1000 * 60)) % 60)
      let hours = "" + Math.floor((t / (1000 * 60 * 60)) % 24)
      return hours + " heures et " + minutes + " mn"
  }

  public gotToHistoryDetail(match: MatchModel) {
    this.store.dispatch(new Navigate(['/match-history-detail', match.matchId]))
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}

export class MatchDataSource extends DataSource<MatchModel | undefined> {
  private _cachedData = Array.from<MatchModel>({length: this._length})
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

    // Use `setTimeout` to simulate fetching data from server.
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
