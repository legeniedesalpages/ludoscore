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
    <div matRipple [ngStyle]="{'left.px': draggableX + 150}" class="test" draggable="false" 
    (mousedown)="clicMouse($event)" (mouseup)="releaseMouse($event)" (mousemove)="moveMouse($event)"
    (mouseleave)="releaseMouse($event)" (touchmove)="moveFinger($event)" (touchstart)="touch($event)" (touchend)="end($event)"
    (click)="action()">{{rand}}</div>
    `,
  styles: [`
  .test {
    width:100px;
    height: 100px;
    background-color: lightblue;
    user-select: none;
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

  rand = Math.random()


  touch(event: TouchEvent) {
    this.clic(event.touches[0].clientX)
  }
  clicMouse(event: MouseEvent) {
    this.clic(event.clientX)
    
  }
  clic(x: number) {
    this.startX = x;
    this.clicked = true;
  }


  end(event: TouchEvent) {
    this.release()
  }
  releaseMouse(event: MouseEvent) {
    this.release()
  }
  release() {
    this.clicked = false;
    this.startX = 0;
    this.draggableX = 0;
  }


  moveFinger(event: TouchEvent) {
    this.move(event.touches[0].clientX)
  }
  moveMouse(event: MouseEvent) {
    this.move(event.clientX)
  }
  move(x: number) {
    if (this.clicked) {
      this.dragging = true;
      this.draggableX = x - this.startX;
    }
  }
}
