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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameSearchDetail } from 'src/app/core/model/game-search-detail.model';
import { Game } from 'src/app/core/model/game.model';
import { FindGameService } from 'src/app/core/services/find-game.service';
import { GameService } from 'src/app/core/services/game.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss', './home.component.css']
})
export class HomeComponent {

  options: any
  getCurrentMatchUrl = environment.apiURL + '/api/matches/current'

  dataReceived: boolean
  matchInProgress: boolean
  imageUrl: string = ""
  matchId: number = 0

  constructor(private http: HttpClient, private router: Router, private gameService: GameService) {
    this.matchInProgress = false;
    this.dataReceived = false;

    this.options = {
      headers: new HttpHeaders({
        Accept: 'application/json'
      }),
      withCredentials: true
    };

    this.http.get(this.getCurrentMatchUrl, this.options).subscribe(response => {

      console.debug("Match en cours:", response);
      const res = JSON.parse(JSON.stringify(response))
      this.matchInProgress = res.hasCurrent;
      this.matchId = res.match.id

      this.gameService.get(res.match.game_id).subscribe({

        next: (game: Game) => {
          this.imageUrl = `'${game.image_id}'`;
          this.dataReceived = true;
        }
      }
      )
    });
  }

  public findGame() {
    this.router.navigate(['find-game']);
  }

  public gameList() {
    this.router.navigate(['game-list']);
  }

  public playerList() {
    this.router.navigate(['player-manager']);
  }

  public finishMatch() {
    console.log("finish")
    this.router.navigate(['match-finisher', this.matchId]);
  }
}
