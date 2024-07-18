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
import { Observable, tap } from 'rxjs'
import { MatchModel } from 'src/app/core/model/match.model'
import { MatchService } from 'src/app/core/services/match/match.service'
import { DatePipe } from '@angular/common';

@Component({
  templateUrl: './match-history.component.html',
  styleUrls: ['./match-history.component.css', '../../../core/css/list.css']
})
export class MatchHistoryComponent implements OnInit {

  public matches!: Observable<MatchModel[]>

  public loading: boolean = true

  constructor(private store: Store, private matchService: MatchService, private datePipe: DatePipe) {
  }

  ngOnInit(): void {
    this.matches = this.matchService.getAllMatches().pipe(tap(_ => {
      this.loading = false
    }))
    
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

    headline += "<br/><span class='players'>Avec: "
    headline += match.teams.map(team => team.id == match.winnigTeam?.id ? '<b>' + team.name + '</b>' : team.name ).join(', ')
    headline += "</span>"

    return headline
  }

  public elapsedTime(startDate: Date, endDate: Date) {
      let t = endDate.getTime() - new Date(startDate).getTime()
      let minutes = "" + Math.floor((t / (1000 * 60)) % 60)
      let hours = "" + Math.floor((t / (1000 * 60 * 60)) % 24)
      return hours + " heures et " + minutes + " mn"
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }
}
