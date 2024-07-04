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
import { Component, OnInit } from '@angular/core';
import { Navigate } from '@ngxs/router-plugin';
import { Store } from '@ngxs/store';
import { PlayerEntity } from 'src/app/core/entity/player-entity.model';
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service';

@Component({
  selector: 'manage-player',
  templateUrl: './manage-player.component.html',
  styleUrls: ['./manage-player.component.css', '../../../core/css/list.css']
})
export class ManagePlayerComponent implements OnInit {
  
  public playerEntities: PlayerEntity[]
  public loading: boolean = true

  constructor(private store: Store, private playerService: PlayerCrudService) {
    this.playerEntities = []
  }

  ngOnInit(): void {
    this.playerService.findAll().subscribe({
      next: (playerEntities: PlayerEntity[]) => {
        this.playerEntities = playerEntities
        this.loading = false
      }
    });
  }

  public returnToHome() { 
    this.store.dispatch(new Navigate(['/']))
  }

  public editPlayer(id: number) {
    this.store.dispatch(new Navigate(['/edit-player', id]));
  }

  public createPlayer() {
    this.store.dispatch(new Navigate(['/edit-player/0']));
  }
}
