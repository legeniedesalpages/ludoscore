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
import { Location } from '@angular/common';
import { PlayerService } from 'src/app/core/services/player.service';
import { UserService } from 'src/app/core/services/user.service';
import { switchMap, map, of } from 'rxjs';
import { Player } from 'src/app/core/model/player.model';
import { User } from 'src/app/core/model/user.model';

@Component({
  selector: 'player-editor',
  templateUrl: './player-editor.component.html',
  styleUrls: ['./player-editor.component.css']
})
export class PlayerEditorComponent implements OnInit {

  public loading: boolean
  public saving: boolean
  public creating: boolean
  public playerEditorForm: FormGroup

  private player!: Player
  public user: User | null = null

  constructor(
    private route: ActivatedRoute, private location: Location, private router: Router,
    private playerService: PlayerService, private userService: UserService,
    private snackBar: MatSnackBar
  ) {

    console.debug("Init player editor")

    this.loading = true;
    this.saving = false;
    this.creating = true;

    this.playerEditorForm = new FormGroup({
      pseudo: new FormControl('', Validators.required),
      lastName: new FormControl(''),
      firstName: new FormControl(''),
      initials: new FormControl('', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]),
      preferedColor: new FormControl(''),
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      if (params.get("id") === null) {
        console.debug("Create new user")
        this.loading = false;
        this.creating = true;
      } else {
        const id = params.get("id")
        console.debug("Edit existing user id:", id)
        this.creating = false;

        this.playerService.get(Number(id)).pipe(
          map(player => {
            this.player = player
            this.playerEditorForm.get('pseudo')?.setValue(player.pseudo)
            this.playerEditorForm.get('lastName')?.setValue(player.lastName)
            this.playerEditorForm.get('firstName')?.setValue(player.firstName)
            this.playerEditorForm.get('initials')?.setValue(player.initials)
            return player.id
          }),
          switchMap(idPlayer => idPlayer != null ? this.userService.getFromPlayerId(idPlayer) : of(null))
        ).subscribe({
          next: (user) => {
            this.user = user
            this.loading = false;
          },
          error: _ => {
            this.loading = false
          }
        })
      }
    })
  }

  public savePlayer(): void {

    this.saving = true;
    const player: Player = {
      id: this.player == null ? null : this.player.id,
      lastName: this.playerEditorForm.get('lastName')?.value, // nom
      firstName: this.playerEditorForm.get('firstName')?.value, // prénom
      pseudo: this.playerEditorForm.get('pseudo')?.value,
      initials: this.playerEditorForm.get('initials')?.value,
      preferedColor: "",
      gravatar: ""
    }

    this.playerService.save(player, this.user).subscribe({
      next: _ => {
        this.saving = false;
        this.snackBar.open("Joueur enregistré", 'Fermer', {
          duration: 5000
        })
        this.router.navigate(['player-manager']);
      },
      error: _ => {
        this.saving = false
      }
    })
  }

  public cancel() {
    this.location.back()
  }

  public searchUser() {
    console.log("Search user")
  }

  public deletePalyer() {
    console.log("Delete Player")
  }
}
