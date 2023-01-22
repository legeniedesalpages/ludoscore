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
import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Game } from 'src/app/core/model/game.model';
import { GameService } from 'src/app/core/services/game.service';

@Component({
  selector: 'game-form',
  templateUrl: './game-form.component.html',
  styleUrls: ['./game-form.component.css']
})
export class GameFormComponent implements OnInit {

  @Input() public saving: boolean = false
  @Input() public loading: boolean = false
  @Input() public gameId!: number

  @Output() private gameFoundEvent = new EventEmitter<Game>()

  public imageUrl: string = ""

  constructor(private gameService: GameService) {
    console.debug("Create form")
  }

  ngOnInit(): void {
    console.debug("Init form")
  }

  ngOnChanges(changes: SimpleChanges) {
    this.gameIdChange(changes['gameId'].currentValue)
  }

  private gameIdChange(changedGameId: number) {
    if (changedGameId == 0) {
      return
    }
    
    console.info("Game Id changed: " + changedGameId)
    this.gameService.get(changedGameId).subscribe({
      next: game => {
        if (game != null) {
          this.imageUrl = game.image_id
          this.gameFoundEvent.emit(game)
        } else {
          this.imageUrl = ""
        }
      }
    })
  }
}
