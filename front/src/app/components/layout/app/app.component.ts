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
import { query, style, transition, trigger, animate, group } from '@angular/animations';
import { Component } from '@angular/core';
import { ChildrenOutletContexts, RouterOutlet } from '@angular/router';

export const slider =
  trigger('routeAnimations', [
    transition('* => isLeft', slideTo('left')),
    transition('* => isRight', slideTo('right')),
    transition('isRight => *', slideTo('left')),
    transition('isLeft => *', slideTo('right'))
  ]);

function slideTo(direction: string) {
  const optional = { optional: true };
  return [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        [direction]: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      })
    ], optional),
    query(':enter', [
      style({
        overflow: 'hidden',
        [direction]: '-100%'
      })
    ]),
    group([
      query(':leave', [
        animate('600ms ease', style({
          overflow: 'hidden',
          [direction]: '100%'
        }))
      ], optional),
      query(':enter', [
        animate('600ms ease', style({
          [direction]: '0%',
          overflow: 'hidden'
        }))
      ])
    ])
  ];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [slider]
})
export class AppComponent {



  constructor(private contexts: ChildrenOutletContexts) {
    console.debug("Launching 'Ludo score'");
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation']
  }
}
