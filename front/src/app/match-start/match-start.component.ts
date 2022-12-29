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
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export class Game {
  constructor(public id: number, public title: string) { }
}

@Component({
  selector: 'match-start',
  templateUrl: './match-start.component.html',
  styleUrls: ['./match-start.component.css'],
})
export class MatchStartComponent {

  private gameUrl = environment.apiURL + '/api/games';

  loading: boolean = true;
  saving: boolean = false;
  createMatchForm: FormGroup;
  games: Game[] = [];
  filteredOptions: Observable<Game[]> | null = null;

  constructor(private http: HttpClient) {

    this.createMatchForm = new FormGroup({
      game: new FormControl('', Validators.required)
    });

  }

  ngOnInit(): void {
    this.http.get(this.gameUrl).subscribe({
      next: (res: any) => {
        this.games = res.map((r: any) => new Game(r.id, r.title));    
        
        this.filteredOptions = this.createMatchForm.valueChanges.pipe(
          startWith(''),
          map(value => this._filter(value || '')),
        );

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
      }
    })
  }


  cancelCreation() {
    console.debug('Cancel match creation');
  }

  onSubmit() {
  }

  private _filter(value: any): Game[] {
    if (!value || !value.game) {
      console.log("show all");
      return this.games;
    }
    console.log(value.game);
    const filterValue = value.game.toLowerCase();    
    return this.games.filter(jeu => jeu.title.toLowerCase().includes(filterValue));
  }
}
