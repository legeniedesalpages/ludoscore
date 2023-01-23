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

import { Component } from '@angular/core';
import { pageAnimation } from './core/animation/page.animation';


@Component({
  selector: 'app-root',
  animations: [pageAnimation],
  template: `
    <div class="app" [@routeAnimations]="o && o.activatedRouteData 
      && o.activatedRouteData['animation']">
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
      perspective:  1200px;
      transform-style:  preserve-3d;
    }
  `]
})
export class AppComponent {

  constructor() {
    console.info("Launching 'Ludo score'");
  }
}
