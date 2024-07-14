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
import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { PlayerEntity } from 'src/app/core/entity/player-entity.model'
import { UserEntity } from 'src/app/core/entity/user-entity.model'
import { COLORS } from 'src/app/core/model/tag.model'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { AuthStateModel } from 'src/app/core/state/auth/auth.model'
import { AuthState } from 'src/app/core/state/auth/auth.state'

@Component({
  selector: 'edit-player',
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.css', '../../../core/css/list.css']
})
export class EditPlayerComponent implements OnInit {

  public playerEditorForm: FormGroup

  public users: UserEntity[] = []
  
  public loading: boolean = true
  public creating: boolean = false
  public saving: boolean = false
  public colors = COLORS
  public currentPlayerId: number = 0
  public isEditable: boolean = false

  constructor(private store: Store, private route: ActivatedRoute, private playerService: PlayerCrudService, private userCrudService: UserCrudService, private snackBar: MatSnackBar) {
    this.playerEditorForm = new FormGroup({
      pseudo: new FormControl('', Validators.required),
      prenom: new FormControl(''),
      nom: new FormControl(''),
      couleur: new FormControl(''),
      user: new FormControl({value: '', disabled: true})
    })
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.currentPlayerId = Number(params.get('id'))
      console.debug("Id: ", this.currentPlayerId)
      this.creating = (this.currentPlayerId === 0)
      console.debug("Creating: ", this.creating)
      let loggedUserId: number = this.store.selectSnapshot<AuthStateModel>(AuthState).id

      this.userCrudService.findAll().subscribe(users => {
        this.users = users
        
        let loggedUser: UserEntity = this.users.find(user => user.id === loggedUserId)!

        console.debug("Logged user: ", loggedUser)
        if (loggedUser.isAdmin) {
          this.playerEditorForm.get('user')?.enable()
          this.isEditable = true
        }

        if (!this.creating) {        
          
          this.playerService.findOne(this.currentPlayerId).subscribe(playerEntity => {
            let userId = null
            if (playerEntity.user) {
              userId = playerEntity.user.id
              if (loggedUserId === userId) {
                this.isEditable = true
              }    
            }

            this.playerEditorForm.setValue({
              pseudo: playerEntity.pseudo,
              prenom: playerEntity.firstName,
              nom: playerEntity.lastName,
              couleur: playerEntity.preferedColor,
              user: userId
            })
            this.loading = false
          })
        } else {
          this.isEditable = true
          
          if (!this.users.find(user => user.id === loggedUserId)?.playerId) {
            this.playerEditorForm.get('user')?.setValue(loggedUserId)
          }
          
          this.loading = false
        }
      })
    })
  }

  public returnToList() { 
    this.store.dispatch(new Navigate(['/manage-player']))
  }

  public save() {
    this.saving = true
    let playerEntity: PlayerEntity = {
      id: this.currentPlayerId,
      pseudo: this.playerEditorForm.get('pseudo')?.value,
      firstName: this.playerEditorForm.get('prenom')?.value,
      lastName: this.playerEditorForm.get('nom')?.value,
      preferedColor: this.playerEditorForm.get('couleur')?.value,
      user: {
        id: this.playerEditorForm.get('user')?.value,
        email: ''
      },
      gravatar: '',
      createdAt: undefined
    }

    if (this.creating) {
      this.playerService.save(playerEntity).subscribe(() => {
        console.debug("Player created")
        this.saving = false
        this.snackBar.open("Joueur créé", 'Fermer', {
          duration: 10000
        })
        this.store.dispatch(new Navigate(['/']))
      })
    } else {
      this.playerService.update(playerEntity.id, playerEntity).subscribe(() => {
        console.debug("Player updated")
        this.saving = false
        this.snackBar.open("Joueur mis à jour", 'Fermer', {
          duration: 10000
        })
        this.store.dispatch(new Navigate(['/']))
      })
    }
  }
}
