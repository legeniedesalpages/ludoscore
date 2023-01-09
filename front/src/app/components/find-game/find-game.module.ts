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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { FindGameComponent } from './find-game.component';
import { AuthGuardService } from 'src/app/core/services/auth-guard.service';
import { FindGameService } from 'src/app/core/services/find-game.service';

const routes: Routes = [
  {
    path: '',
    component: FindGameComponent,
    canActivate: [AuthGuardService]
  }
];

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
    MatRippleModule
  ],
  exports: [FindGameComponent],
  providers: [FindGameService]
})

export class FindGameModule { }
