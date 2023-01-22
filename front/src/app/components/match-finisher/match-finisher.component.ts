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
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchService } from 'src/app/core/services/match.service';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormControl } from '@angular/forms';
import { Game } from 'src/app/core/model/game.model';
import { Match } from 'src/app/core/model/match.model';
import { MatchCrudService } from 'src/app/core/services/crud/match-crud.service';

@Component({
  selector: 'match-finisher',
  templateUrl: './match-finisher.component.html',
  styleUrls: ['./match-finisher.component.css', '../../core/css/form.css']
})
export class MatchFinisherComponent implements OnInit {

  public loading: boolean = true
  public saving: boolean = false
  public matchFinisherForm: FormGroup
  public gameId: number = 0
  public time: number = 0
  public dateStart: Date


  constructor(private router: Router, private route: ActivatedRoute,
    private snackBar: MatSnackBar, private dialog: MatDialog,
    public matchService: MatchService, private matchCrudService: MatchCrudService) {

    this.matchFinisherForm = new FormGroup({
      name: new FormControl(''),
    });

    this.dateStart = new Date()

    setInterval(() => {
      this.time = new Date().getTime() - new Date(this.dateStart).getTime()
    }, 500);
  }

  ngOnInit(): void {
    console.log("init")
    this.saving = false
    this.loading = true

    this.route.paramMap.subscribe((params) => {
      const matchId = Number(params.get('id'))
      console.debug("Macth id: " + matchId)

      this.matchCrudService.get(matchId).subscribe({
        next: match => {
          if (!match.running) {
            throw new Error("Match must be start before finish it")
          }
          this.loading = false
          this.gameId = match.game_id
          this.dateStart = match.started_at
        }
      })
    })
  }

  public formatTime(t: number): string {
    const hour = Math.round(t/(1000*60*60))%24
    const minute = Math.round(t/(1000*60))%60
    const seconde = Math.round(t/(1000))%60

    if (hour == 0 && minute == 0) {
      return "moins d'une minute"      
    }

    if (hour == 0) {
      return (minute + "").padStart(2 ,"0") + " minute" + (minute > 1 ? "s" : "") + " et " + (seconde + "").padStart(2 ,"0") + " seconde" + (seconde > 1 ? "s " : " ")
    }

    return (hour + "").padStart(2 ,"0") + " heure" + (hour > 1 ? "s " : " ") + (minute + "").padStart(2 ,"0") + " minute" + (minute > 1 ? "s " : " ") + (seconde + "").padStart(2 ,"0") + " seconde" + (seconde > 1 ? "s " : " ")
  }

  public finishGame() {
    this.matchService.finishMatch()
  }
}
