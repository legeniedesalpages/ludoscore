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

import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatDividerModule } from '@angular/material/divider'
import { MatFormFieldModule } from '@angular/material/form-field'
import { LayoutModule } from '../layout.module'
import { LoadingSpinnerModule } from '../spinner/loading-spinner.module'
import { MatChipsModule } from '@angular/material/chips'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatDialogModule } from '@angular/material/dialog'
import { ConfirmationDialogComponent } from './confirmation.component'


@NgModule({
  declarations: [ConfirmationDialogComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatDividerModule,
    MatFormFieldModule,
    LayoutModule,
    LoadingSpinnerModule,
    MatChipsModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  exports: [ConfirmationDialogComponent]
})

export class ConfirmationDialogModule { }
