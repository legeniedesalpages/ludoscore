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
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from 'src/app/core/services/game.service';
import { MatchService } from 'src/app/core/services/match.service';


@Component({
  selector: 'player-list',
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.css']
})
export class PlayerListComponent {

  movies = [
    'Episode I - The Phantom Menace',
    'Episode II - Attack of the Clones',
    'Episode III - Revenge of the Sith',
    'Episode IV - A New Hope',
    'Episode V - The Empire Strikes Back',
    'Episode VI - Return of the Jedi',
    'Episode VII - The Force Awakens',
    'Episode VIII - The Last Jedi',
    'Episode IX - The Rise of Skywalker',
    'Episode I - The Phantom Menace',
    'Episode II - Attack of the Clones',
    'Episode III - Revenge of the Sith',
    'Episode IV - A New Hope',
    'Episode V - The Empire Strikes Back',
    'Episode VI - Return of the Jedi',
    'Episode VII - The Force Awakens',
    'Episode VIII - The Last Jedi',
    'Episode IX - The Rise of Skywalker',
  ];

  drop(event: CdkDragDrop<string[]>) {
    if (Math.abs(event.distance.x) > 100) {
      console.log(event.distance.x > 0 ? 'effacer' : 'favoris')
    }
  }

  computeDragRenderPos(pos:any, dragRef:any) {
    let x = pos.x - dragRef._pickupPositionInElement.x;
    if (Math.abs(x) < 30) {
      x= dragRef._pickupPositionOnPage.x - dragRef._pickupPositionInElement.x
    }
    if (x < -180) {
      x = -180
    }
    if (x > 180) {
      x = 180
    }
    return {x: x, y: dragRef._pickupPositionOnPage.y - dragRef._pickupPositionInElement.y};
  }

  clic() {
    console.info("sdfqsdfsdf")
  }
}
