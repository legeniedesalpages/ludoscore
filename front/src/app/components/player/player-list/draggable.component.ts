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
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface WipeActionStyle {
  backgroundColor: string,
  icon: string,
  text: string
}

@Component({
  selector: 'drag-element',
  template: `
    <div class="hiding-parent">

      <div matRipple 
      [ngStyle]="{'left.px': draggableX, 'cursor': dragging ? 'move' : 'pointer'}" 
      [ngClass]="['draggable', dragClass]" 
      draggable="false" (click)="action()"
      (mousedown)="clicMouse($event)" (mouseup)="releaseMouse($event)" (mousemove)="moveMouse($event)" (mouseleave)="leave($event)" 
      (touchmove)="moveFinger($event)" (touchstart)="touch($event)" (touchend)="end($event)">
        Clicked:{{clicked}}<br/>
        Wipe:{{wipe}}<br/>
        Dragging:{{dragging}}<br/>
      </div>

      <div class="back" [ngStyle]="{'background-color': backgroundColor}">
        <div class="txt" [ngStyle]="{'opacity': wipe === 'none' ? '0.2':'0.9', 'flex-direction':direction}"><mat-icon>{{icon}}</mat-icon>{{text}}</div>
      </div>

    </div>
    `,
  styles: [`
  .hiding-parent {
    overflow:hidden;
    width:100%;
  }
  .drop {
    transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
  }
  .draggable {
    width:100%;
    height: 60px;
    user-select: none;
    position: relative;
    transition-property: all;
    z-index:1;
    overflow:hidden;
    background-color:white;
    cursor:pointer;
    box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.12), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
  }
  .back {
    width:100%;
    height: 60px;
    position: relative;   
    display: flex; 
    margin-top: -60px;
  }
  .txt {
    width:100%;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .mat-icon {
    margin-left:5px;
    margin-right:5px;
    width:40px;
    height:40px;
    font-size: 40px;
  }
  `]
})
export class DraggableComponent {

  @Input() leftWipeStyle: WipeActionStyle | null = null
  @Input() rightWipeStyle: WipeActionStyle | null = null

  @Output() rightSwipeEvent = new EventEmitter<void>();
  @Output() leftSwipeEvent = new EventEmitter<void>();
  @Output() actionEvent = new EventEmitter<void>();

  public clicked: boolean = false;
  public wipe: string = ""
  public dragging: boolean = false;
  public backgroundColor: string = ''
  public text: string = '';
  public direction: string = ''
  public icon: string = "";
  public startX: number = 0
  public draggableX: number = 0
  public dragClass: string = ""

  public action() {
    if (!this.dragging) {
      this.actionEvent.emit()
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
    this.dragClass = ""
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
      if (this.wipe === 'right') {
        this.rightSwipeEvent.emit()
      }
      if (this.wipe === 'left') {
        this.leftSwipeEvent.emit()
      }
    }
    this.wipe = "none"
    this.dragClass = "drop"
    this.dragging = false
  }


  moveFinger(event: TouchEvent) {
    if (this.dragging) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.move(event.touches[0].clientX)
  }
  moveMouse(event: MouseEvent) {
    this.move(event.clientX)
  }
  move(x: number) {
    if (this.clicked && (Math.abs(x - this.startX) > 60 || this.dragging == true)) {

      if (this.rightWipeStyle == null && x - this.startX < 0) {
        return
      }
      if (this.leftWipeStyle == null && x - this.startX > 0) {
        return
      }

      this.dragging = true;
      this.draggableX = x - this.startX;
    }

    if (this.dragging) {
      if (x - this.startX > 0) {
        this.wipe = "left"
        this.direction = "row"
        this.backgroundColor = this.leftWipeStyle?.backgroundColor!
        this.icon = this.leftWipeStyle?.icon!
        this.text = this.leftWipeStyle?.text!
      } else {
        this.wipe = "right"
        this.direction = "row-reverse"
        this.backgroundColor = this.rightWipeStyle?.backgroundColor!
        this.icon = this.rightWipeStyle?.icon!
        this.text = this.rightWipeStyle?.text!
      }

      if (Math.abs(x - this.startX) < 120) {
        this.wipe = "none"
      }
    }
  }
}
