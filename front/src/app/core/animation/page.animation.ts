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
  keyframes,
  useAnimation
} from '@angular/animations';

export const sharedStyles = {
  position: 'fixed',
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  transformStyle: 'preserve-3d'
};

export const rotateCarouselToRight = animation([
  query(':enter, :leave', style(sharedStyles)
    , { optional: true }),
  group([
    query(':enter', [
      style({ 'transform-origin': '100% 50%' }),
      animate('{{enterTiming}}s {{enterDelay}}s ease', keyframes([
        style({ opacity: '0.3', transform: 'translateX(-200%) scale(.4) rotateY(-120deg)', offset: 0 }),
        style({ opacity: '1', transform: 'translate3d(0,0,0)', offset: 1 })
      ]))
    ], { optional: true }),
    query(':leave', [
      style({ 'transform-origin': '0% 50%' }),
      animate('{{leaveTiming}}s {{leaveDelay}}s ease', keyframes([
        style({ opacity: '1', transform: 'translate3d(0, 0, 0)', offset: 0 }),
        style({ opacity: '.3', transform: 'translateX(200%) scale(.4) rotateY(120deg)', offset: 1 }),
      ]))
    ], { optional: true }),
  ])
], { params: { enterTiming: '0.5', leaveTiming: '0.5', enterDelay: '0', leaveDelay: '0' } });

export const rotateCarouselToLeft = animation([
  query(':enter, :leave', style(sharedStyles)
    , { optional: true }),
  group([
    query(':enter', [
      style({ 'transform-origin': '0% 50%' }),
      animate('{{enterTiming}}s {{enterDelay}}s ease', keyframes([
        style({ opacity: '0.1', transform: 'translateX(150%) scale(.4) rotateY(120deg)', offset: 0 }),
        style({ opacity: '1', transform: 'translate3d(0,0,0)', offset: 1 })
      ]))
    ], { optional: true }),
    query(':leave', [
      style({ 'transform-origin': '100% 50%' }),
      animate('{{leaveTiming}}s {{leaveDelay}}s ease', keyframes([
        style({ opacity: '1', transform: 'translate3d(0, 0, 0)', offset: 0 }),
        style({ opacity: '.3', transform: 'translateX(-150%) scale(.4) rotateY(-120deg)', offset: 1 }),
      ]))
    ], { optional: true }),
  ])
], { params: { enterTiming: '0.5', leaveTiming: '0.5', enterDelay: '0', leaveDelay: '0' } });

export const pageAnimation = trigger('routeAnimations', [
  transition('* => isLeft', useAnimation(rotateCarouselToRight)),
  transition('* => isRight', useAnimation(rotateCarouselToLeft)),
  transition('isRight => *', useAnimation(rotateCarouselToRight)),
  transition('isLeft => *', useAnimation(rotateCarouselToLeft))
]);
