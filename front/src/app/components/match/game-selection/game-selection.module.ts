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
import { Routes, RouterModule } from '@angular/router'
import { AuthGuardService } from 'src/app/core/services/auth/auth-guard.service'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { A11yModule } from '@angular/cdk/a11y'
import { FormsModule } from '@angular/forms'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatDividerModule } from '@angular/material/divider'
import { SidenavModule } from '../../layout/sidenav/sidenav.module'
import { GameSelectionComponent } from './game-selection.component'
import { LayoutComponent } from '../../layout/layout.component'

const routes: Routes = [ { path: '', component: GameSelectionComponent, canActivate: [AuthGuardService] }]

@NgModule({
  declarations: [GameSelectionComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatButtonModule,
    LoadingSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    A11yModule,
    FormsModule,
    MatCheckboxModule,
    MatDividerModule,
    SidenavModule,
    LayoutComponent
  ]
})
export class GameSelectionModule { }
