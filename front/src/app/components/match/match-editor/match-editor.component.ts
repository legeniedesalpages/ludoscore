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
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  templateUrl: './match-editor.component.html',
  styleUrls: ['./match-editor.component.css'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        transform: 'scaleX(1)',        
      })),
      state('out', style({
        transform: 'scaleX(0)',
      })),
      transition('in => out', animate('300ms ease-in-out')),
      transition('out => in', animate('300ms ease-out'))
    ]),
    trigger('fadeInOut', [
      state('in', style({
        opacity: 0.9
      })),
      state('out', style({
        opacity: 1
      })),
      transition('in => out', [style({ opacity: 0.9 }), animate(200, style({ opacity: 1 }))]),
      transition('out => in', [style({ opacity: 1 }), animate(200, style({ opacity: 0.9 }))])
    ])
  ]
})
export class MatchEditorComponent implements OnInit {

  public env = environment
  public loading: boolean = true
  public gameList: GameEntity[] = []
  public searching: boolean = false;
  public searchText: string = "";

  menuState: string = 'out';

  toggleMenu() {
    this.menuState = this.menuState === 'out' ? 'in' : 'out';
  }

  constructor(private store: Store, private gameCrudService: GameCrudService) {
  }

  ngOnInit(): void {
    this.loading = true
    this.searching = false;
    this.gameCrudService.findAll().subscribe(res => {
      const myClonedArray = Object.assign([], res);
      this.gameList = res.concat(res, myClonedArray)
      this.loading = false
    })
  }
}
