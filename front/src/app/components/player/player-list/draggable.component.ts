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
import { Component, OnInit, ViewChild, ElementRef, Input, HostListener } from '@angular/core';
import { Observable, map, fromEvent, switchMap, takeUntil, tap, merge } from 'rxjs';

interface MoveEvent {
  positionX: number,
  actionWhenDragStart: Function
}

@Component({
  selector: 'drag-element',
  template: `
      <div class="hiding-parent">
        <div #back class="back back-style">
          <div class="txt"><mat-icon>delete</mat-icon>Supprimer</div>
        </div>
        <div #draggable class="front front-style" draggable="false">
          <ng-content></ng-content>
        </div>
      </div>  
    `,
  styleUrls: ['./draggable.component.css']
})
export class DraggableComponent implements OnInit {

  @HostListener('window:scroll')
  onScroll() {
    this.scroll = true;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => { this.scroll = false; }, 300);
  }
  public scroll: boolean = false;
  private timeout: NodeJS.Timeout = setTimeout(() => { this.scroll = false; }, 1);

  @Input() tresholdStartDrag: number = 20;
  @Input() tresholdAction: number = 150;

  @ViewChild('draggable', { static: true }) private draggableDiv!: ElementRef<HTMLDivElement>
  @ViewChild('back', { static: true }) private backDiv!: ElementRef<HTMLDivElement>

  public fade: string = "0";

  ngOnInit() {

    // overlap divs : back behind front
    let height = this.draggableDiv.nativeElement.offsetHeight
    this.draggableDiv.nativeElement.style.marginTop = `-${height}px`
    this.backDiv.nativeElement.style.height = `${height}px`

    // prepare actions
    const mouseDown = merge(
      fromEvent<MouseEvent>(this.draggableDiv.nativeElement, 'mousedown').pipe(map(event => event.clientX)),
      fromEvent<TouchEvent>(this.draggableDiv.nativeElement, 'touchstart').pipe(map(event => event.touches[0].clientX))
    )
    const mouseMove = merge(
      fromEvent<MouseEvent>(document, 'mousemove').pipe(map(event => this.mouseMoveEvent(event))),
      fromEvent<TouchEvent>(document, 'touchmove', { passive: false }).pipe(map(event => this.touchMoveEvent(event)))
    )
    const mouseUp = merge(
      fromEvent<MouseEvent>(document, 'mouseup'),
      fromEvent<TouchEvent>(document, 'touchend')
    )

    // drag pipeline
    mouseDown.pipe(
      tap(_ => {
        this.draggableDiv.nativeElement.classList.remove('drop')
      }),
      switchMap(startPositionX => {
        return mouseMove.pipe(
          map(moveEvent => {
            this.fade = this.calcFade(moveEvent.positionX, startPositionX).toPrecision(2);
            this.backDiv.nativeElement.style.opacity = this.fade
            if (Math.abs(moveEvent.positionX - startPositionX) > this.tresholdStartDrag && !this.scroll) {
              moveEvent.actionWhenDragStart()
              return { left: moveEvent.positionX - startPositionX }
            }
            return { left: 0 }
          }),
          takeUntil(mouseUp.pipe(
            tap(_ => {
              this.draggableDiv.nativeElement.classList.add('drop')
              this.draggableDiv.nativeElement.style.left = '0px'
            })
          ))
        );
      })).subscribe(pos => {
        this.draggableDiv.nativeElement.style.left = `${pos.left}px`
      });
  }

  private calcFade(positionX: number, startPositionX: number): number {
    const calc = Math.abs(positionX - startPositionX) / this.tresholdAction
    if (calc > 1) {
      return 1;
    }
    return calc;
  }

  private mouseMoveEvent(event: MouseEvent): MoveEvent {
    return {
      positionX: event.clientX,
      actionWhenDragStart: () => { }
    }
  }

  private touchMoveEvent(event: TouchEvent): MoveEvent {
    return {
      positionX: event.touches[0].clientX,
      actionWhenDragStart: () => {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }
}