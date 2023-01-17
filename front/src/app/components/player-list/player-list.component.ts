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
import { Component } from '@angular/core';

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

  private clicked: boolean = false;
  private dragging: boolean = false;

  public startX: number = 0
  public draggableX: number = 0

  rand = Math.random()



  public action() {
    if (!this.dragging) {
      console.warn("Action!")
    } else {
      this.dragging = false;
    }
  }

  clicMouse(event: MouseEvent) {
    console.debug("Clic:", event)
    this.startX = event.clientX;
    this.clicked = true;
  }

  releaseMouse(event: MouseEvent) {
    console.debug("UnClick:", event)
    this.clicked = false;
    this.startX = 0;
  }

  moveMouse(event: MouseEvent) {
    if (this.clicked) {
      if (Math.abs(this.startX - event.clientX) > 30) {
        this.dragging = true;
        this.draggableX = event.clientX;
      }
    }
  }
}
