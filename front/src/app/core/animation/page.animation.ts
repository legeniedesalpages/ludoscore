/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 23/01/2023 - 15:48:15
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 23/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import {
  trigger,
  query,
  style,
  animate,
  transition,
  group,
  animation,
  useAnimation,
  animateChild
} from '@angular/animations';

export const slideLeft = animation(
  [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        'transform-origin': 'top right'
      })
    ]),
    query(':enter', [
      style({
        transform: 'scaleX(0)',
        'transform-origin': 'top left'
      })
    ]),
    query(':leave', animateChild(), { optional: true }),
    group([
      query(':leave', [
        animate('300ms ease-out', style({ transform: 'scaleX(0)' }))
      ], { optional: true }),
      query(':enter', [
        animate('300ms ease-out', style({ transform: 'scaleX(1)' }))
      ], { optional: true }),
      query('@*', animateChild(), { optional: true })
    ]),
  ]
);

export const slideRight = animation(
  [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        'transform-origin': 'top left'
      })
    ], { optional: true }),
    query(':enter', [
      style({
        transform: 'scaleX(0)',
        'transform-origin': 'top right'
      })
    ], { optional: true }),
    query(':leave', animateChild(), { optional: true }),
    group([
      query(':leave', [
        animate('300ms ease-out', style({ transform: 'scaleX(0)' }))
      ], { optional: true }),
      query(':enter', [
        animate('300ms ease-out', style({ transform: 'scaleX(1)' }))
      ], { optional: true }),
      query('@*', animateChild(), { optional: true })
    ]),
  ]
);

export const pageAnimation = trigger('routeAnimations', [
  transition('* => home', useAnimation(slideLeft)),
  transition('home => *', useAnimation(slideRight)),

  transition('game-selection => player-selection', useAnimation(slideRight)),
  transition('player-selection => match-display', useAnimation(slideRight)),
  transition('match-display => match-end', useAnimation(slideRight)),

  transition('player-selection => game-selection', useAnimation(slideLeft)),
  transition('match-history => match-history-detail', useAnimation(slideRight)),
  transition('match-history-detail => match-history', useAnimation(slideLeft)),
]);
