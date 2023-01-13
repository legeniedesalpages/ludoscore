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
import { GameService } from 'src/app/core/services/game.service';

@Component({
  selector: 'game-list',
  templateUrl: './game-list.component.html',
  styleUrls: ['./game-list.component.css']
})
export class GameListComponent implements OnInit {

  public searching: boolean;
  public searchString: string;

  constructor(public gameService: GameService) {
    this.searching = false;
    this.searchString = '';
  }

  ngOnInit(): void {
    console.log("List");
    this.searching = true
    this.gameService.list().subscribe((game) => {
      console.log(game)
      this.searching = false
    })
  }

  public filter(event: any) {
  }

  public prettyTime(dateToFormat: string | null): string {
    if (dateToFormat === null) {
      return ""
    }
    return "1 jour"
  }
}
