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
import { Component, OnInit } from '@angular/core'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { MatchService } from 'src/app/core/services/match/match.service'
import { DatePipe } from '@angular/common'
import { ActivatedRoute } from '@angular/router'
import { Observable, switchMap, tap } from 'rxjs'
import { MatchModel } from 'src/app/core/model/match.model'


@Component({
  templateUrl: './match-history-detail.component.html',
  styleUrls: ['./match-history-detail.component.css', '../../../core/css/list.css'],
  standalone: false
})
export class MatchHistoryDetailComponent implements OnInit {

  public match!: Observable<MatchModel>

  public loading: boolean = true

  constructor(private store: Store, private route: ActivatedRoute, private matchService: MatchService, private datePipe: DatePipe) {
  }

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

    let headline: string
    if (match.canceled) {
      headline = "Annulé le " + this.datePipe.transform(match.endedAt, 'dd/MM/yyyy') + ' à ' + this.datePipe.transform(match.endedAt, 'HH:mm')
    } else if (!match.endedAt) {
      headline = "En cours depuis " + this.elapsedTime(match.startedAt!, new Date())
    } else {
      headline = "Jouée le " + this.datePipe.transform(match.endedAt, 'dd/MM/yyyy') + ' en ' + this.elapsedTime(match.startedAt!, new Date(match.endedAt))
    }

    return headline
  }

  public elapsedTime(startDate: Date, endDate: Date) {
      let t = endDate.getTime() - new Date(startDate).getTime()
      let minutes = "" + Math.floor((t / (1000 * 60)) % 60)
      let hours = "" + Math.floor((t / (1000 * 60 * 60)) % 24)
      if (hours == "0") {
        return minutes + " minutes"
      }
      return hours + " heures et " + minutes + " mn"
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
