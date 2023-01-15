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
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from 'src/app/core/services/game.service';
import { MatchService } from 'src/app/core/services/match.service';

@Component({
  selector: 'game-list',
  templateUrl: './game-list.component.html',
  styleUrls: ['./game-list.component.css']
})
export class GameListComponent implements OnInit {

  @Output() gameSelectedEvent = new EventEmitter<number>();

  public searching: boolean;
  public searchString: string;

  constructor(public gameService: GameService, public matchService: MatchService, private route: ActivatedRoute, private router: Router) {
    this.searching = false;
    this.searchString = '';
  }

  ngOnInit(): void {
    console.debug("List game")
    this.searching = true
    this.gameService.list().subscribe((game) => {
      console.info("Game list size: " + game.length)
      this.searching = false
    })
  }

  public filter(event: any) {
  }

  public gameAction(gameId: number) {
    console.debug("GameId selected:" + gameId)
    this.gameSelectedEvent.emit(gameId);
  }

  public prettyTime(dateToFormat: string | null): string {
    if (dateToFormat === null) {
      return ""
    }
    return "1 jour"
  }
}
