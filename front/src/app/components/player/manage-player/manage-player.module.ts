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
import { AuthGuardService } from 'src/app/core/services/auth/auth-guard.service';
import { LayoutModule } from '../../layout/layout.module';
import { ManagePlayerComponent } from './manage-player.component';
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service';
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module';
import { MatChipsModule } from '@angular/material/chips';

const routes: Routes = [
  {
    path: '',
    component: ManagePlayerComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [ManagePlayerComponent],
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
    MatRippleModule,
    LayoutModule,
    LoadingSpinnerModule,
    MatChipsModule
  ],
  exports: [ManagePlayerComponent],
  providers: [PlayerCrudService]
})

export class ManagePlayerModule { }
