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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { LoadingSpinnerModule } from 'src/app/components/layout/spinner/loading-spinner.module'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchFormatterService } from 'src/app/core/services/match/match-formatter.service'
import { MatchService } from 'src/app/core/services/match/match.service'
import { LayoutComponent } from '../../layout/layout.component'


@Component({
  templateUrl: './match-history-detail.component.html',
  styleUrls: ['./match-history-detail.component.css', '../../../core/css/list.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CommonModule, AsyncPipe, NgStyle,
    RouterModule,
    MatButtonModule, MatCardModule, MatDividerModule, MatIconModule,
    LoadingSpinnerModule,
    LayoutComponent
  ]
})
export class MatchHistoryDetailComponent implements OnInit {

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private matchService = inject(MatchService);
  public formatter = inject(MatchFormatterService);

  public match!: Observable<MatchModel>
  public photoUrl$!: Observable<SafeUrl | null>
  public loading: boolean = true

  private sanitizer = inject(DomSanitizer)
  private changeDetectorRef = inject(ChangeDetectorRef)

  ngOnInit(): void {
    this.match = this.route.paramMap.pipe(switchMap(params => {
      const id = Number(params.get('id'))
      console.log("id match:", id)
      return this.matchService.getMatch(id).pipe(tap(() => {
        this.loading = false
        this.changeDetectorRef.markForCheck()
      }))
    }))

    this.photoUrl$ = this.route.paramMap.pipe(
      switchMap(params => this.matchService.getMatchPhoto(Number(params.get('id'))).pipe(catchError(() => of(null)))),
      map(blob => blob ? this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob)) : null)
    )
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
