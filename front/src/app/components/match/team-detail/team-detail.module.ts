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
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatDividerModule } from '@angular/material/divider'
import { LayoutModule } from '../../layout/layout.module'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { MatChipsModule } from '@angular/material/chips'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { TeamDetailComponent } from './team-detail.component'
import { MatDialogModule } from '@angular/material/dialog'
import { TagsSelectionModule } from '../tags-selection/tags-selection.module'



@NgModule({
  declarations: [TeamDetailComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatDividerModule,
    LayoutModule,
    LoadingSpinnerModule,
    MatChipsModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDialogModule,
    TagsSelectionModule
  ],
  exports: [TeamDetailComponent]
})

export class TeamDetailModule { }
