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
import { AuthGuardService } from 'src/app/core/services/auth-guard.service';
import { GameListModule } from '../game-list/game-list.module';
import { LoadingSpinnerModule } from '../layout/spinner/loading-spinner.module';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameService } from 'src/app/core/services/game.service';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { GameEditorModule } from '../game-editor/game-editor.module';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatchService } from 'src/app/core/services/match.service';
import { PlayerService } from 'src/app/core/services/player.service';
import { MatchFinisherComponent } from './match-finisher.component';
import { GameFormModule } from '../shared/game-form/game-form.module';
import { MatchCrudService } from 'src/app/core/services/crud/match-crud.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';

const routes: Routes = [
  {
    path: '',
    component: MatchFinisherComponent,
    canActivate: [AuthGuardService]
  }
];

@NgModule({
  declarations: [MatchFinisherComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    GameListModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    GameEditorModule,
    MatChipsModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    LoadingSpinnerModule,
    GameFormModule,
    MatProgressBarModule
  ],
  providers: [
    GameService,
    PlayerService,
    MatchService,
    MatchCrudService
  ]
})
export class MatchFinisherModule { }