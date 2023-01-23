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
import { Location } from '@angular/common';
import { Component, ViewChild, ElementRef, Input } from '@angular/core';
import { fromEvent } from "rxjs";

@Component({
  selector: 'app-layout',
  template: `
    <div class="container">
      <div class="header" #headerDiv>
        <button mat-icon-button *ngIf="!withBackButton"><mat-icon>menu</mat-icon></button>
        <button mat-icon-button *ngIf="withBackButton" (click)="back()"><mat-icon>keyboard_backspace</mat-icon></button>
        <span class="menu-spacer" *ngIf="!withBackButton"></span>
        <ng-content select="ng-container[role=header]"></ng-content>
      </div>

      <ng-content select="ng-container[role=body]" (scrollPosition)="scrollChanged($event)"></ng-content>

      <div class="bottom">
        <ng-content select="ng-container[role=footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .container {
      min-height: 100%;
    }

    .header {
      top:0px;
      position: sticky;
      bottom: 0px;  
      width: 100%;
      height: 60px;
      display: flex;
      flex-direction: row;
      align-items: center;
      z-index:999;
    }

    .scrolling {
      box-shadow: 0 5px 5px -1px rgba(0, 0, 0, 0.18);
    }

    .bottom {
      position: sticky;
      bottom:0;
    }

    ::ng-deep.title {
      text-align: center;
      width:100%;
      text-transform: uppercase;
    }
  `]
})
export class LayoutComponent {

  @ViewChild('headerDiv', { static: true }) private headerDiv!: ElementRef<HTMLDivElement>

  @Input() public withBackButton!: boolean

  constructor(private location: Location) {

    fromEvent(window, "scroll").subscribe(() => {
      const verticalOffset = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (verticalOffset == 0) {
        this.headerDiv.nativeElement.classList.remove('scrolling')
      } else {
        this.headerDiv.nativeElement.classList.add('scrolling')
      }
    });
  }

  public back(): void {
    this.location.back()
  }
}
