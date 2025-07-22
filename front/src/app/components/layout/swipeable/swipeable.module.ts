/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 28/01/2023 - 14:31:05
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 28/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'
import { SwipeableComponent } from './swipeable.component'
import { MatButtonModule } from '@angular/material/button'

@NgModule({
    declarations: [SwipeableComponent],
    imports: [
        CommonModule,
        MatIconModule,
        MatButtonModule
    ],
    exports: [SwipeableComponent, MatIconModule]
})
export class SwipeableModule { }