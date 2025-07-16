/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 11:21:12
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LoadingSpinnerComponent } from './loading-spinner.component'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'

@NgModule({
  declarations: [LoadingSpinnerComponent],
  imports: [
    CommonModule,
    MatProgressSpinnerModule
  ],
  exports: [LoadingSpinnerComponent, MatProgressSpinnerModule]
})

export class LoadingSpinnerModule { }
