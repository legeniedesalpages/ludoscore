/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/12/2022 - 11:27:36
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { PlayerEntity } from 'src/app/core/entity/player-entity.model';
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service';
import { CancelMatchCreation } from 'src/app/core/state/match/match.action';
import { MatchState } from 'src/app/core/state/match/match.state';
import { environment } from 'src/environments/environment';
import { MatSelect } from '@angular/material/select';
import { forkJoin } from 'rxjs';

@Component({
  templateUrl: './player-selection.component.html',
  styleUrls: ['./player-selection.component.css']
})
export class PlayerSelectionComponent implements OnInit {

  @ViewChild('playerSelector') public playerSelector!: MatSelect

  public env = environment
  public loading: boolean = true
  public gameTitle: string = ""
  public filteredChoosablePlayers: PlayerEntity[] = []
  public playerSelection: string | PlayerEntity = ""

  constructor(private store: Store, private router: Router, private playerCrudService: PlayerCrudService) {
  }

  ngOnInit(): void {
    this.loading = true
    forkJoin({
      state: this.store.selectOnce(MatchState),
      players: this.playerCrudService.findAll()
    }).subscribe(actions => {
      this.gameTitle = actions.state.gameTitle
      this.filteredChoosablePlayers = actions.players
      this.loading = false
    })
  }

  public cancelMatchCreation() {
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.router.navigate(['']))
  }

  public cancelGameSelection() {
    this.store.dispatch(new CancelMatchCreation()).subscribe(() => this.router.navigate(['game-selection']))
  }

  public actionPlayer(event: string | PlayerEntity) {
    if (event === 'search') {
      console.log("Recherche")
    } else if (event === 'team') {
      console.log("Equipe")
    } else {
      this.playerSelector.value = ""
    }
  }
}
