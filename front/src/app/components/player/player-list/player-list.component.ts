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
import { Component, OnInit, Input } from '@angular/core';
import { Player } from 'src/app/core/model/player.model';
import { PlayerService } from 'src/app/core/services/player.service';

@Component({
  selector: 'player-list',
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.css']
})
export class PlayerListComponent implements OnInit {

  onScroll() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => { this.action = ""; }, 300);
  }
  private timeout: NodeJS.Timeout = setTimeout(() => { this.action = ""; }, 1);

  @Input() players: Player[] = []
  public action:string = ""

  constructor(public playerService: PlayerService) {}

  ngOnInit(): void {
    console.debug("player list init")
  }

  public deleteAction(player: Player) {
    console.info("delete")
    this.action = "delete"
    this.onScroll()
  }

  public addToFavoriteAction(player: Player) {
    console.info("favorite")
    this.action = "favorite"
    this.onScroll()
  }

  public detail(player: Player) {
    console.warn("action:" + player)
    this.action = "action"
    this.onScroll()
  }
}
