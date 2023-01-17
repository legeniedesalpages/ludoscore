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
    <div class="hiding-parent">

      <div matRipple [ngStyle]="{'left.px': draggableX}" class="test" draggable="false" (click)="action()"
      (mousedown)="clicMouse($event)" (mouseup)="releaseMouse($event)" (mousemove)="moveMouse($event)" (mouseleave)="leave($event)" 
      (touchmove)="moveFinger($event)" (touchstart)="touch($event)" (touchend)="end($event)">
        <ng-content></ng-content>
      </div>

      <div class="back" [ngStyle]="{'background-color': backgroundColor, 'flex-direction':direction}"><mat-icon>{{icon}}</mat-icon>{{text}}</div>

    </div>
    `,
  styles: [`
  .hiding-parent {
    overflow:hidden;
    width:100%;
  }
  .test {
    width:100%;
    height: 60px;
    user-select: none;
    position: relative;
    transition-property: left;
    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    z-index:1;
    overflow:hidden;
    background-color:white;
  }
  .back {
    width:100%;
    height: 60px;
    display: flex;
    position: relative;
    flex-direction: row;
    align-items: center;
    margin-top: -60px;
  }
  .mat-icon {
    width:40px;
    height:40px;
    opacity:.6;
    font-size: 40px;
  }
  `]
})
export class DraggableComponent {

  //
  private clicked: boolean = false;

  public wipe: string = ""
  public dragging: boolean = false;
  public backgroundColor: string = ''
  public text: string = '';
  public direction: string = ''
  public icon: string = "";
  public startX: number = 0
  public draggableX: number = 0

  public action() {
    if (!this.dragging) {
      console.warn("Action!")
    } else {
      this.dragging = false;
    }
  }

  leave(_: MouseEvent) {
    this.clicked = false
    this.startX = 0
    this.draggableX = 0
    this.wipe = "none"
    this.dragging = false
  }


  touch(event: TouchEvent) {
    this.clic(event.touches[0].clientX)
  }
  clicMouse(event: MouseEvent) {
    this.clic(event.clientX)

  }
  clic(x: number) {
    this.startX = x
    this.clicked = true
    this.wipe = "none"
  }


  end(_: TouchEvent) {
    this.release()
  }
  releaseMouse(_: MouseEvent) {
    this.release()
  }
  release() {
    this.clicked = false;
    this.startX = 0;
    this.draggableX = 0;
    if (this.wipe !== "none" && this.dragging) {
      console.warn("Wipe: " + this.wipe)
    }
    this.wipe = "none"
  }


  moveFinger(event: TouchEvent) {
    this.move(event.touches[0].clientX)
  }
  moveMouse(event: MouseEvent) {
    this.move(event.clientX)
  }
  move(x: number) {
    if (this.clicked && (Math.abs(x - this.startX) > 30 || this.dragging == true)) {
      this.dragging = true;
      this.draggableX = x - this.startX;
    }

    if (this.dragging) {
      if (x - this.startX > 0) {
        this.wipe = "left"
        this.backgroundColor = 'lightcoral'
        this.icon = "delete"
        this.direction = "row"
        this.text = "Supprimer"
      } else {
        this.wipe = "right"
        this.icon = "stars"
        this.text = "Favoris"
        this.direction = "row-reverse"
        this.backgroundColor = 'lightblue'
      }

      if (Math.abs(x - this.startX) < 60) {
        this.wipe = "none"
      }
    }
  }
}
