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
import { Component, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'find-game-detail',
  templateUrl: './find-game-detail.component.html',
  styleUrls: ['./find-game-detail.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FindGameDetailComponent {

  id: any;
  loading: boolean;
  gameDetailForm: FormGroup;


  private gameSearcDetailhUrl = environment.apiURL + '/api/game_search_detail?id=';

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {
    this.loading = true;

    this.gameDetailForm = new FormGroup({
      name: new FormControl('', Validators.required),
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      console.log('Show detail for id: ' + params.get('id'));
      this.id = params.get('id');

      this.http.get(this.gameSearcDetailhUrl + encodeURIComponent(this.id)).subscribe({
        complete: () => {
          this.loading = false;
        },
        next: (res: any) => {
          console.log("Detail: " + res.image);
          this.gameDetailForm.setValue({
            name: res.name
          });
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        }
      });

    });
  }

}
