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
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'

import { A11yModule } from '@angular/cdk/a11y'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { RouterModule, Routes } from '@angular/router'
import { AuthGuardService } from 'src/app/core/services/auth/auth-guard.service'
import { LayoutComponent } from '../../layout/layout.component'
import { FindGameComponent } from './find-game.component'

const routes: Routes = [
  {
    path: '',
    component: FindGameComponent,
    canActivate: [AuthGuardService]
  }
]

@NgModule({
  declarations: [FindGameComponent],
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
    MatSnackBarModule,
    A11yModule,
    LayoutComponent
  ],
  exports: [FindGameComponent],
  providers: []
})

export class FindGameModule { }
