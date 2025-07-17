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
import { AsyncPipe, CommonModule, NgStyle } from '@angular/common'
import { Component, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Observable, switchMap, tap } from 'rxjs'
import { LayoutModule } from 'src/app/components/layout/layout.module'
import { LoadingSpinnerModule } from 'src/app/components/layout/spinner/loading-spinner.module'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchFormatterService } from 'src/app/core/services/match/match-formatter.service'
import { MatchService } from 'src/app/core/services/match/match.service'


@Component({
  templateUrl: './match-history-detail.component.html',
  styleUrls: ['./match-history-detail.component.css', '../../../core/css/list.css'],
  standalone: true,
  imports: [
    CommonModule, AsyncPipe, NgStyle,
    RouterModule,
    MatButtonModule, MatCardModule, MatDividerModule, MatIconModule,
    LoadingSpinnerModule, LayoutModule
  ]
})
export class MatchHistoryDetailComponent implements OnInit {

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private matchService = inject(MatchService);
  public formatter = inject(MatchFormatterService);

  public match!: Observable<MatchModel>
  public loading: boolean = true

  ngOnInit(): void {
    this.match = this.route.paramMap.pipe(switchMap(params => {
      const id = Number(params.get('id'))
      console.log("id match:", id)
      return this.matchService.getMatch(id).pipe(tap(_ =>
        this.loading = false
      ))
    }))
  }


  public line(match: MatchModel): string {
    return this.formatter.line(match);
  }

  public elapsedTime(startDate: Date, endDate: Date): string {
    return this.formatter.elapsedTime(startDate, endDate);
  }

  public deteleMatchHistory() {
    this.match.pipe(switchMap(m => this.matchService.deleteMatch(m.matchId!))).subscribe(() => {
      this.returnToMatchHistory()
    })
  }

  public returnToMatchHistory() {
    this.store.dispatch(new Navigate(['/match-history']))
  }
}
