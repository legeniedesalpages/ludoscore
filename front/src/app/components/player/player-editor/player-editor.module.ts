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
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthGuardService } from 'src/app/core/services/auth-guard.service';
import { MatDialogModule } from '@angular/material/dialog';
import { PlayerEditorComponent } from './player-editor.component';
import { PlayerService } from 'src/app/core/services/player.service';
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module';
import { UserService } from 'src/app/core/services/user.service';

const routes: Routes = [
  {
    path: '',
    component: PlayerEditorComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [PlayerEditorComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatButtonModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatGridListModule,
    MatRippleModule,
    MatCheckboxModule,
    MatSelectModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    LoadingSpinnerModule
  ],
  providers: [
    PlayerService,
    UserService
  ]
})

export class PlayerEditorModule { }
