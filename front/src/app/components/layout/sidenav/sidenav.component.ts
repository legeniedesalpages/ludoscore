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
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core'
import { fadeInOut, slideInOut } from 'src/app/core/animation/sidenav.anmiation'
import { fromEvent } from "rxjs"

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  animations: [slideInOut, fadeInOut]
})
export class SidenavComponent implements OnInit {

  @Input() isOpen!: boolean
  @Output() isOpenChange = new EventEmitter<boolean>()

  constructor() { }

  ngOnInit(): void {
    window.addEventListener('wheel', e => {
          if (this.isOpen) {
            e.preventDefault()
          }
        }, { passive: false })
    
        fromEvent(window, "scroll").subscribe(e => {
          if (this.isOpen) {
            e.preventDefault()
            e.stopPropagation()
            return false
          }
          return true
        })
  }

  public close() {
    this.isOpen = false
    this.isOpenChange.emit(false)
  }
}
