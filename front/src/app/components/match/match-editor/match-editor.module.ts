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
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuardService } from 'src/app/core/services/auth/auth-guard.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatchEditorComponent } from './match-editor.component';
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module';
import { LayoutModule } from '../../layout/layout.module';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { A11yModule } from '@angular/cdk/a11y'
import { FormsModule } from '@angular/forms';


const routes: Routes = [
  {
    path: '',
    component: MatchEditorComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [MatchEditorComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    LayoutModule,
    MatProgressSpinnerModule,
    LoadingSpinnerModule,
    MatRippleModule,
    MatFormFieldModule,
    MatInputModule,
    A11yModule,
    FormsModule
  ]
})
export class MatchEditorModule { }
