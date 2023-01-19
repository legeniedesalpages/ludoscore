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
  x: number,
  actionWhenDragStart: Function
}

@Component({
  selector: 'drag2-element',
  template: `
      <div class="hiding-parent">
      
        <div #back class="back back-style">df</div>

        <div #draggable class="front front-style" draggable="false">
          element : {{ scroll }}
        </div>
        
      </div>  
    `,
  styles: [`
    .front-style {
      height: 60px;
      background-color:lightblue;
      box-sizing: border-box;
      border-width: 1px 1px 0px 1px;
      border-style: solid;
    }
    .back-style {
      background-color: red;
      box-sizing: border-box;
      border-width: 1px 1px 0px 1px;
      border-style: solid;
    }

    .drop {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .hiding-parent {
      overflow:hidden;
      width:100%;
    }
    .front {
      width:100%;
      user-select: none;
      transition-property: all;
      position: relative;
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.12), 0 8px 10px 1px rgba(0, 0, 0, 0.14), 0 3px 14px 2px rgba(0, 0, 0, 0.12);
    }
    .back {
      width:100%;
      user-select: none;
      position: relative;
      box-shadow: inset 0 5px 5px -3px rgba(0, 0, 0, 0.12), inset 0 8px 10px 1px rgba(0, 0, 0, 0.14), inset 0 3px 14px 2px rgba(0, 0, 0, 0.12);
    }
  `]
})
export class DraggableComponent2 implements OnInit {

  @HostListener('window:scroll', ['$event'])
  onScroll(_: any) {
    this.scroll = true;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => { this.scroll = false; }, 300);
  }
  public scroll: boolean = false;
  private timeout: NodeJS.Timeout = setTimeout(() => { this.scroll = false; }, 1);

  @Input() tresholdStartDrag: number = 20;

  @ViewChild('draggable', { static: true })
  private draggableDiv!: ElementRef<HTMLDivElement>

  @ViewChild('back', { static: true })
  private backDiv!: ElementRef<HTMLDivElement>

  private mouseDown!: Observable<number>
  private mouseMove!: Observable<MoveEvent>
  private mouseUp!: Observable<Event>

  ngOnInit() {

    let h = this.draggableDiv.nativeElement.offsetHeight + "px"
    this.draggableDiv.nativeElement.style.marginTop = "-" + h
    this.backDiv.nativeElement.style.height = h

    this.mouseDown = merge(
      fromEvent<MouseEvent>(this.draggableDiv.nativeElement, 'mousedown').pipe(map(event => event.clientX)),
      fromEvent<TouchEvent>(this.draggableDiv.nativeElement, 'touchstart').pipe(map(event => event.touches[0].clientX))
    )
    this.mouseMove = merge(
      fromEvent<MouseEvent>(document, 'mousemove').pipe(map(event => this.mouseMoveEvent(event))),
      fromEvent<TouchEvent>(document, 'touchmove', { passive: false }).pipe(map(event => this.touchMoveEvent(event)))
    )
    this.mouseUp = merge(
      fromEvent<MouseEvent>(document, 'mouseup'),
      fromEvent<TouchEvent>(document, 'touchend')
    )

    this.mouseDown.pipe(
      tap(_ => {
        this.draggableDiv.nativeElement.classList.remove('drop');
        console.debug("Start drag")
      }),
      switchMap(startEventX => {
        return this.mouseMove.pipe(
          map(moveEvent => {
            if (Math.abs(moveEvent.x - startEventX) > this.tresholdStartDrag && !this.scroll) {
              moveEvent.actionWhenDragStart()
              return { left: moveEvent.x - startEventX }
            }
            return { left: 0 }
          }),
          takeUntil(this.mouseUp.pipe(
            tap(_ => {
              this.draggableDiv.nativeElement.classList.add('drop');
              this.draggableDiv.nativeElement.style.left = "0px"
              console.debug("Stop drag")
            })
          )));
      })).subscribe(pos => {
        this.draggableDiv.nativeElement.style.left = `${pos.left}px`
      });
  }

  private mouseMoveEvent(event: MouseEvent): MoveEvent {
    return {
      x: event.clientX,
      actionWhenDragStart: () => { }
    }
  }

  private touchMoveEvent(event: TouchEvent): MoveEvent {
    return {
      x: event.touches[0].clientX,
      actionWhenDragStart: () => {
        event.preventDefault();
        event.stopPropagation();
        console.log('touch')
      }
    }
  }
}