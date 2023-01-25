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
import { Store } from '@ngxs/store';
import { GameEntity } from 'src/app/core/entity/game-entity.model';
import { GameCrudService } from 'src/app/core/services/crud/game-crud.service';
import { environment } from 'src/environments/environment';

@Component({
  templateUrl: './match-editor.component.html',
  styleUrls: ['./match-editor.component.css'],
})
export class MatchEditorComponent implements OnInit {

  public env = environment
  public loading: boolean = true
  public gameList: GameEntity[] = []
  public searching: boolean = false;
  public searchText: string = "";

  constructor(private store: Store, private gameCrudService: GameCrudService) {
  }

  ngOnInit(): void {
    this.loading = true
    this.searching = false;
    this.gameCrudService.findAll().subscribe(res => {
      const myClonedArray  = Object.assign([], res);
      this.gameList = res.concat(res, myClonedArray)
      this.loading = false
    })
  }

  public showSearch() {
    this.searching = true
  }

  public cancelSearch() {
    this.searching = false
  }
}
