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
  selector: 'drag-element',
  template: `
    <div matRipple [ngStyle]="{'left.px': draggableX}" class="test" draggable="false" 
    (mousedown)="clicMouse($event)" (mouseup)="releaseMouse($event)" (mousemove)="moveMouse($event)" (click)="action()"></div>
    `,
  styles: [`
  .test {
    width:100px;
    height: 100px;
    background-color: lightblue;
  }
  `]
})
export class DraggableComponent {

  private clicked: boolean = false;
  private dragging: boolean = false;

  public startX: number = 0
  public draggableX: number = 0

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
