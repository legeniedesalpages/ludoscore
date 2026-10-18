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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { PlayerAssociation, PlayerAssociationRights, PlayerEntity } from 'src/app/core/entity/player-entity.model'
import { UserEntity } from 'src/app/core/entity/user-entity.model'
import { COLORS } from 'src/app/core/model/tag.model'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { PlayerService } from 'src/app/core/services/player/player.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { AuthState } from 'src/app/core/state/auth/auth.state'

@Component({
  selector: 'edit-player',
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
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
  public playedMatchCount?: number
  public isAdmin = false
  public canViewPersonalInfo = true
  public canViewOtherMatches = true
  public associations: PlayerAssociation[] = []
  public associationsLoading = false
  public associationSaving = false
  public associationError = ''
  public loadError = ''
  public associationUserId: number | null = null
  public newRights: PlayerAssociationRights = {
    canViewPersonalInfo: false, canViewOtherMatches: false, canAddToMatch: false,
  }

  constructor(private store: Store, private route: ActivatedRoute, private playerService: PlayerCrudService, private playerListService: PlayerService, private userCrudService: UserCrudService, private snackBar: MatSnackBar, private changeDetectorRef: ChangeDetectorRef) {
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
      this.loading = true
      this.loadError = ''
      this.isEditable = false
      this.associations = []
      this.currentPlayerId = Number(params.get('id'))
      this.playedMatchCount = undefined
      this.changeDetectorRef.markForCheck()
      console.debug("Id: ", this.currentPlayerId)
      this.creating = (this.currentPlayerId === 0)
      console.debug("Creating: ", this.creating)
      let loggedUserId: number = this.store.selectSnapshot<number>(AuthState.userId)

      this.userCrudService.findAll().subscribe(users => {
        this.users = users
        this.changeDetectorRef.markForCheck()
        
        let loggedUser: UserEntity = this.users.find(user => user.id === loggedUserId)!
        this.isAdmin = loggedUser.isAdmin

        console.debug("Logged user: ", loggedUser)
        if (loggedUser.isAdmin) {
          this.playerEditorForm.get('user')?.enable()
          this.isEditable = true
        }

        if (!this.creating) {        
          
          this.playerService.findOne(this.currentPlayerId).subscribe({ next: playerEntity => {
            this.playedMatchCount = playerEntity.playedMatchCount
            this.canViewPersonalInfo = playerEntity.permissions?.canViewPersonalInfo ?? true
            this.canViewOtherMatches = playerEntity.permissions?.canViewOtherMatches ?? true
            if (playerEntity.permissions) {
              this.isEditable = playerEntity.permissions.canEdit
            }
            for (const field of ['prenom', 'nom']) {
              if (this.canViewPersonalInfo) this.playerEditorForm.get(field)?.enable()
              else this.playerEditorForm.get(field)?.disable()
            }
            let userId = null
            if (playerEntity.user) {
              userId = playerEntity.user.id
              if (loggedUserId === userId) {
                this.isEditable = true
              }    
            }

            this.playerEditorForm.setValue({
              pseudo: playerEntity.pseudo,
              prenom: playerEntity.firstName ?? '',
              nom: playerEntity.lastName ?? '',
              couleur: playerEntity.preferedColor,
              user: userId
            })
            this.loading = false
            if (this.isAdmin) this.loadAssociations()
            this.changeDetectorRef.markForCheck()
          }, error: () => {
            this.loadError = "Impossible de charger ce joueur : il n'existe plus ou vous n'y avez pas accès."
            this.loading = false
            this.changeDetectorRef.markForCheck()
          } })
        } else {
          this.isEditable = true
          this.canViewPersonalInfo = true
          this.canViewOtherMatches = true
          this.playerEditorForm.get('prenom')?.enable()
          this.playerEditorForm.get('nom')?.enable()
          
          if (!this.users.find(user => user.id === loggedUserId)?.playerId) {
            this.playerEditorForm.get('user')?.setValue(loggedUserId)
          }
          
          this.loading = false
          this.changeDetectorRef.markForCheck()
        }
      })
    })
  }

  public returnToList() { 
    this.store.dispatch(new Navigate(['/manage-player']))
  }

  public loadAssociations() {
    this.associationsLoading = true
    this.associationError = ''
    this.playerService.associations(this.currentPlayerId).subscribe({
      next: associations => {
        this.associations = associations
        this.associationsLoading = false
        this.changeDetectorRef.markForCheck()
      },
      error: () => {
        this.associationError = 'Impossible de charger les associations.'
        this.associationsLoading = false
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  public hasAssociation(userId: number): boolean {
    return this.associations.some(association => association.userId === userId)
  }

  public saveAssociation(userId: number, rights: PlayerAssociationRights) {
    this.associationSaving = true
    this.associationError = ''
    this.playerService.saveAssociation(this.currentPlayerId, userId, {
      canViewPersonalInfo: rights.canViewPersonalInfo,
      canViewOtherMatches: rights.canViewOtherMatches,
      canAddToMatch: rights.canAddToMatch,
    }).subscribe({
      next: associations => {
        this.associations = associations
        this.associationSaving = false
        this.associationUserId = null
        this.newRights = { canViewPersonalInfo: false, canViewOtherMatches: false, canAddToMatch: false }
        this.playerListService.invalidateCache()
        this.snackBar.open('Association enregistrée', 'Fermer', { duration: 5000 })
        this.changeDetectorRef.markForCheck()
      },
      error: () => {
        this.associationSaving = false
        this.associationError = "Impossible d'enregistrer cette association."
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  public deleteAssociation(userId: number) {
    this.associationSaving = true
    this.associationError = ''
    this.playerService.deleteAssociation(this.currentPlayerId, userId).subscribe({
      next: () => {
        this.associationSaving = false
        this.playerListService.invalidateCache()
        this.loadAssociations()
      },
      error: () => {
        this.associationSaving = false
        this.associationError = "Impossible de retirer ce lien : le créateur et l'identité personnelle doivent être conservés."
        this.changeDetectorRef.markForCheck()
      },
    })
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
        this.playerListService.invalidateCache()
        this.saving = false
        this.changeDetectorRef.markForCheck()
        this.snackBar.open("Joueur créé", 'Fermer', {
          duration: 10000
        })
        this.store.dispatch(new Navigate(['/']))
      })
    } else {
      this.playerService.update(playerEntity.id, playerEntity).subscribe(() => {
        console.debug("Player updated")
        this.playerListService.invalidateCache()
        this.saving = false
        this.changeDetectorRef.markForCheck()
        this.snackBar.open("Joueur mis à jour", 'Fermer', {
          duration: 10000
        })
        this.store.dispatch(new Navigate(['/']))
      })
    }
  }
}
