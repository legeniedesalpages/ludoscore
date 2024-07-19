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
import { CommonModule, DatePipe } from '@angular/common'

import { Routes, RouterModule } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatDividerModule } from '@angular/material/divider'
import { AuthGuardService } from 'src/app/core/services/auth/auth-guard.service'
import { LayoutModule } from '../../layout/layout.module'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { MatChipsModule } from '@angular/material/chips'
import { MatchHistoryDetailComponent } from './match-history-detail.component'

const routes: Routes = [
  {
    path: '',
    component: MatchHistoryDetailComponent,
    canActivate: [AuthGuardService]
  }
]

@NgModule({
  declarations: [MatchHistoryDetailComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
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
    MatChipsModule
  ],
  exports: [MatchHistoryDetailComponent],
  providers: [DatePipe]
})

export class MatchHistoryDetailModule { }
