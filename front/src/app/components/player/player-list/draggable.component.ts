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
import { Component, OnInit, ViewChild, ElementRef, Input, HostListener, Output, EventEmitter } from '@angular/core';
import { map, fromEvent, switchMap, takeUntil, tap, merge } from 'rxjs';

interface MoveEvent {
  positionX: number,
  actionWhenDragStart: Function
}

export interface WipeActionStyle {
  backgroundColor: string,
  icon: string,
  text: string
}

@Component({
  selector: 'drag-element',
  template: `
      <div class="hiding-parent">
        <div #back class="back">
          <div #action class="txt"><mat-icon>{{ icon }}</mat-icon>{{ text}}</div>
        </div>
        <div #draggable class="front" draggable="false">
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
  private scroll: boolean = false;
  private timeout: NodeJS.Timeout = setTimeout(() => { this.scroll = false; }, 1);

  public icon: string = "";
  public text: string = "";

  @Input() tresholdStartDrag: number = 20;
  @Input() tresholdAction: number = 150;
  @Input() leftWipeStyle: WipeActionStyle | null = null
  @Input() rightWipeStyle: WipeActionStyle | null = null

  @Output() rightSwipeEvent = new EventEmitter<void>();
  @Output() leftSwipeEvent = new EventEmitter<void>();
  @Output() actionEvent = new EventEmitter<void>();

  @ViewChild('draggable', { static: true }) private draggableDiv!: ElementRef<HTMLDivElement>
  @ViewChild('back', { static: true }) private backDiv!: ElementRef<HTMLDivElement>
  @ViewChild('action', { static: true }) private actionDiv!: ElementRef<HTMLDivElement>

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
            this.applyFading(moveEvent.positionX, startPositionX)
            const diff = moveEvent.positionX - startPositionX
            if (Math.abs(diff) > this.tresholdStartDrag && !this.scroll) {
              moveEvent.actionWhenDragStart()
              return {
                position: diff,
                direction: diff > 0 ? 'left' : 'right'
              }
            }
            return { position: 0 }
          }),
          takeUntil(mouseUp.pipe(
            tap(_ => {
              this.draggableDiv.nativeElement.classList.add('drop')
              this.draggableDiv.nativeElement.style.left = '0px'
            })
          ))
        );
      })).subscribe(event => {
        if (event.direction === 'left' && this.leftWipeStyle != null) {
          this.applyLeftAction()
          this.draggableDiv.nativeElement.style.left = `${event.position}px`
        }
        if (event.direction === 'right' && this.rightWipeStyle != null) {
          this.applyRightAction()
          this.draggableDiv.nativeElement.style.left = `${event.position}px`
        }
      });
  }

  private applyLeftAction() {
    this.backDiv.nativeElement.style.backgroundColor = this.leftWipeStyle?.backgroundColor!
    this.icon = this.leftWipeStyle?.icon!
    this.text = this.leftWipeStyle?.text!
    this.actionDiv.nativeElement.style.flexDirection = 'row'
  }

  private applyRightAction() {
    this.backDiv.nativeElement.style.backgroundColor = this.rightWipeStyle?.backgroundColor!
    this.icon = this.rightWipeStyle?.icon!
    this.text = this.rightWipeStyle?.text!
    this.actionDiv.nativeElement.style.flexDirection = 'row-reverse'
  }

  private applyFading(positionX: number, startPositionX: number) {
    const calc = Math.abs(positionX - startPositionX) / this.tresholdAction
    if (calc > 1) {
      this.backDiv.nativeElement.style.opacity = '1'
      this.actionDiv.nativeElement.style.opacity = '0.8'
    } else {
      this.backDiv.nativeElement.style.opacity = calc.toPrecision(2)
      this.actionDiv.nativeElement.style.opacity = '0.2'
    }
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