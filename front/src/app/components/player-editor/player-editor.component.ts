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
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DateValidator } from 'src/app/core/services/date.validator';
import { FindGameService } from 'src/app/core/services/find-game.service';
import { GameService } from 'src/app/core/services/game.service';

@Component({
  selector: 'player-editor',
  templateUrl: './player-editor.component.html',
  styleUrls: ['./player-editor.component.css']
})
export class PlayerEditorComponent implements OnInit {

  public loading: boolean;
  public saving: boolean;
  public gameEditorForm: FormGroup;

  constructor(private router: Router, private route: ActivatedRoute,
    private findGameService: FindGameService, private snackBar: MatSnackBar, private gameService: GameService
  ) {

    this.loading = true;
    this.saving = false;

    this.gameEditorForm = new FormGroup({
      name: new FormControl('', Validators.required),
      cooperative: new FormControl('', Validators.required),
      minPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      maxPlayer: new FormControl('', [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]),
      ownership: new FormControl('', DateValidator.dateValidator),
    });
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe((params) => {

      console.log(params)
    });
  }

  public saveGame(): void {
  }

  public cancel() {
  }
}
