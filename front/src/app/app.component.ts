/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 12/12/2022 - 23:45:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 12/12/2022
    * - Author          : renau
    * - Modification    : 
**/

import { Component, OnInit } from '@angular/core';
import { pageAnimation } from './core/animation/page.animation';
import { Actions, Store, ofActionCompleted } from '@ngxs/store';
import { DoLogout } from './core/state/auth/auth.actions';
import { Navigate } from '@ngxs/router-plugin';

@Component({
  selector: 'app-root',
  animations: [pageAnimation],
  template: `
    <div class="app" [@routeAnimations]="o && o.activatedRouteData && o.activatedRouteData['animation']">
    
      <router-outlet #o="outlet"></router-outlet>
    </div>
  `,
  styles: [`
    .app {
      width: 100%;
      height: 100%;
      position:  relative;
      width:  100%;
      height:  100%;
      perspective:  1px;
      transform-style:  preserve-3d;
    }
  `],
  standalone: false
})
export class AppComponent implements OnInit {

  constructor(private actions: Actions, private store: Store) {
    console.info("Launching 'Ludo score'");
  }
  
  ngOnInit(): void {
    this.actions.pipe(ofActionCompleted(DoLogout)).subscribe(() => this.store.dispatch(new Navigate(['/login'])))
  }
}
