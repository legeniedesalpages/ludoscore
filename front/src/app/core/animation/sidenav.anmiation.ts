/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 26/01/2023 - 22:15:02
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 26/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import {
    trigger,
    style,
    animate,
    transition,
    state
} from '@angular/animations';


export const slideInOut = trigger('slideInOut', [
    state('out', style({
        transform: 'scaleX(1)',
    })),
    state('in', style({
        transform: 'scaleX(0)',
    })),
    transition('in => out', animate('300ms ease-in-out')),
    transition('out => in', animate('300ms ease-in-out'))
])

export const fadeInOut = trigger('fadeInOut', [
    state('out', style({
        background: 'rgba(70, 70,70, 0.7)',
        display: 'block',
    })),
    state('in', style({
        background: 'rgba(70, 70,70, 0)',
        display: 'none'
    })),
    transition('out => in', [style({ display: 'block', background: 'rgba(70, 70,70, 0.7)' }), animate(200, style({ display: 'block', background: 'rgba(70, 70,70, 0)' }))]),
    transition('in => out', [style({ display: 'block', background: 'rgba(70, 70,70, 0)' }), animate(200, style({ display: 'block', background: 'rgba(70, 70,70, 0.7)' }))])
])