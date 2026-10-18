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
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { PlayerAssociation, PlayerAssociationRights, PlayerEntity, PlayerMergePreview } from 'src/app/core/entity/player-entity.model'
import { UserEntity } from 'src/app/core/entity/user-entity.model'
import { COLORS } from 'src/app/core/model/tag.model'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { PlayerService } from 'src/app/core/services/player/player.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { AuthState } from 'src/app/core/state/auth/auth.state'
import { Clipboard } from '@angular/cdk/clipboard'
import { HttpErrorResponse } from '@angular/common/http'
import { CancelMatchCreation } from 'src/app/core/state/match/match.action'

const LUDOTAG_VALIDATORS = [Validators.required, Validators.maxLength(32), Validators.pattern(/^\s*(?:[2-9A-HJKMNP-Z]{4}[- ]?){2}[2-9A-HJKMNP-Z]{4}\s*$/i)]

@Component({
  selector: 'edit-player',
  templateUrl: './edit-player.component.html',
  styleUrls: ['./edit-player.component.css', '../../../core/css/list.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class EditPlayerComponent implements OnInit, OnDestroy {

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
  public canManageAssociations = false
  public canViewPersonalInfo = true
  public canViewOtherMatches = true
  public associations: PlayerAssociation[] = []
  public associationsLoading = false
  public associationSaving = false
  public associationError = ''
  public loadError = ''
  public ludotag = ''
  public ludotagLoading = false
  public ludotagError = ''
  public joining = false
  public joinError = ''
  public canMerge = false
  public canPersonalize = false
  public canonicalPseudo = ''
  public personalPseudoSaving = false
  public personalPseudoError = ''
  public readonly personalPseudoInput = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] })
  public readonly joinPseudoInput = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] })
  public replacedByPlayerId?: number
  public mergePreview?: PlayerMergePreview
  public mergeLoading = false
  public mergeError = ''
  public readonly mergeLudotagInput = new FormControl('', { nonNullable: true, validators: LUDOTAG_VALIDATORS })
  public readonly mergeConfirmed = new FormControl(false, { nonNullable: true })
  private reviewedLudotag = ''
  private mergeRequestVersion = 0
  private personalPseudoRequestVersion = 0
  public readonly ludotagInput = new FormControl('', {
    nonNullable: true,
    validators: LUDOTAG_VALIDATORS,
  })
  public associationUserId: number | null = null
  public newRights: PlayerAssociationRights = {
    canViewPersonalInfo: false, canViewOtherMatches: false, canAddToMatch: false,
  }

  constructor(private store: Store, private route: ActivatedRoute, private playerService: PlayerCrudService, private playerListService: PlayerService, private userCrudService: UserCrudService, private snackBar: MatSnackBar, private changeDetectorRef: ChangeDetectorRef, private clipboard: Clipboard) {
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
      this.playerEditorForm.disable()
      this.canManageAssociations = false
      this.canPersonalize = false
      this.personalPseudoInput.reset()
      this.joinPseudoInput.reset()
      this.personalPseudoError = ''
      this.personalPseudoSaving = false
      this.personalPseudoRequestVersion++
      this.associations = []
      this.ludotag = ''
      this.ludotagError = ''
      this.joinError = ''
      this.ludotagInput.reset()
      this.canMerge = false
      this.replacedByPlayerId = undefined
      this.mergePreview = undefined
      this.mergeRequestVersion++
      this.mergeLoading = false
      this.mergeError = ''
      this.mergeConfirmed.reset()
      this.mergeLudotagInput.reset()
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
        if (!this.creating) {        
          
          this.playerService.findOne(this.currentPlayerId).subscribe({ next: playerEntity => {
            this.playedMatchCount = playerEntity.playedMatchCount
            this.canViewPersonalInfo = playerEntity.permissions?.canViewPersonalInfo ?? true
            this.canViewOtherMatches = playerEntity.permissions?.canViewOtherMatches ?? true
            this.canMerge = playerEntity.permissions?.canMerge ?? false
            this.canPersonalize = playerEntity.permissions?.canPersonalize ?? false
            this.canonicalPseudo = playerEntity.creatorPseudo ?? playerEntity.pseudo
            this.personalPseudoInput.setValue(playerEntity.personalPseudo ?? '')
            this.canManageAssociations = playerEntity.permissions?.canManageAssociations ?? false
            this.replacedByPlayerId = playerEntity.replacedByPlayerId ?? undefined
            this.isEditable = (playerEntity.permissions?.canEdit ?? false) && !this.replacedByPlayerId
            let userId = null
            if (playerEntity.user) {
              userId = playerEntity.user.id
            }

            this.playerEditorForm.setValue({
              pseudo: this.canonicalPseudo,
              prenom: playerEntity.firstName ?? '',
              nom: playerEntity.lastName ?? '',
              couleur: playerEntity.preferedColor,
              user: userId
            })
            this.updateEditableFields()
            this.loading = false
            if (this.canManageAssociations) this.loadAssociations()
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
          this.updateEditableFields()
          
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

  private updateEditableFields(): void {
    this.playerEditorForm.disable()
    if (!this.isEditable) return
    for (const field of ['pseudo', 'couleur']) {
      this.playerEditorForm.get(field)?.enable()
    }
    if (this.canViewPersonalInfo) {
      this.playerEditorForm.get('prenom')?.enable()
      this.playerEditorForm.get('nom')?.enable()
      if (this.isAdmin) this.playerEditorForm.get('user')?.enable()
    }
  }

  ngOnDestroy(): void {
    this.mergeRequestVersion++
    this.personalPseudoRequestVersion++
  }

  public cancelMergePreview(): void {
    this.mergePreview = undefined
    this.mergeConfirmed.reset()
  }

  public previewMerge(): void {
    if (this.mergeLoading || this.saving || this.associationSaving) return
    this.mergeLudotagInput.markAsTouched()
    if (this.mergeLudotagInput.invalid) return
    this.mergeLoading = true
    this.mergeError = ''
    const version = ++this.mergeRequestVersion
    this.reviewedLudotag = this.mergeLudotagInput.value
    this.playerService.previewMerge(this.currentPlayerId, this.reviewedLudotag).subscribe({
      next: preview => {
        if (version !== this.mergeRequestVersion) return
        this.mergePreview = preview
        this.mergeConfirmed.reset()
        this.mergeLoading = false
        this.changeDetectorRef.markForCheck()
      },
      error: (error: HttpErrorResponse) => {
        if (version === this.mergeRequestVersion) this.reportMergeError(error)
      },
    })
  }

  public confirmMerge(): void {
    if (!this.mergePreview || this.mergePreview.replaced.id !== this.currentPlayerId || this.mergePreview.conflictMatchIds.length || !this.mergeConfirmed.value || this.mergeLoading || this.saving || this.associationSaving) return
    this.mergeLoading = true
    this.mergeError = ''
    const version = ++this.mergeRequestVersion
    this.playerService.merge(this.currentPlayerId, this.reviewedLudotag).subscribe({
      next: () => {
        this.playerListService.invalidateCache()
        if (version !== this.mergeRequestVersion) return
        this.mergeLoading = false
        this.store.dispatch(new CancelMatchCreation())
        this.snackBar.open('Fusion enregistrée. Le joueur remplacé et la trace des participations sont conservés.', 'Fermer', { duration: 10000 })
        this.returnToList()
        this.changeDetectorRef.markForCheck()
      },
      error: (error: HttpErrorResponse) => {
        if (version !== this.mergeRequestVersion) return
        this.cancelMergePreview()
        this.reportMergeError(error)
      },
    })
  }

  private reportMergeError(error: HttpErrorResponse): void {
    const body: unknown = error.error
    this.mergeError = error.status === 429 ? 'Trop de tentatives. Patientez une minute.'
      : body !== null && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message : 'Impossible de fusionner ces joueurs. Réessayez.'
    this.mergeLoading = false
    this.changeDetectorRef.markForCheck()
  }

  public showLudotag(): void {
    this.ludotagLoading = true
    this.ludotagError = ''
    this.playerService.ludotag(this.currentPlayerId).subscribe({
      next: result => {
        this.ludotag = result.ludotag
        this.ludotagLoading = false
        this.changeDetectorRef.markForCheck()
      },
      error: () => {
        this.ludotagLoading = false
        this.ludotagError = 'Impossible de charger le ludotag. Réessayez.'
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  public copyLudotag(): void {
    const copied = this.clipboard.copy(this.ludotag)
    this.snackBar.open(copied ? 'Ludotag copié' : 'Copie impossible : sélectionnez et copiez le ludotag manuellement.', 'Fermer', { duration: 5000 })
  }

  public associateLudotag(): void {
    if (this.joining || this.saving) return
    this.ludotagInput.markAsTouched()
    if (this.ludotagInput.invalid || this.joinPseudoInput.invalid) return
    this.joining = true
    this.joinError = ''
    const personalPseudo = this.joinPseudoInput.value.trim()
    const association = personalPseudo
      ? this.playerService.associateLudotag(this.ludotagInput.value, personalPseudo)
      : this.playerService.associateLudotag(this.ludotagInput.value)
    association.subscribe({
      next: player => {
        this.joining = false
        this.playerListService.invalidateCache()
        this.snackBar.open(`${player.pseudo} est associé à votre compte`, 'Fermer', { duration: 5000 })
        this.returnToList()
        this.changeDetectorRef.markForCheck()
      },
      error: (error: HttpErrorResponse) => {
        this.joining = false
        this.joinError = error.status === 429 ? 'Trop de tentatives. Patientez une minute avant de réessayer.'
          : error.status === 422 ? 'Ludotag invalide ou introuvable. Vérifiez le code reçu.'
          : "Impossible d'associer ce joueur. Réessayez."
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  public savePersonalPseudo(): void {
    if (!this.canPersonalize || this.personalPseudoInput.invalid || this.personalPseudoSaving || this.mergeLoading || this.saving) return
    const version = ++this.personalPseudoRequestVersion
    this.personalPseudoSaving = true
    this.personalPseudoError = ''
    this.playerService.savePersonalPseudo(this.currentPlayerId, this.personalPseudoInput.value.trim() || null).subscribe({
      next: player => {
        if (version !== this.personalPseudoRequestVersion) return
        this.personalPseudoInput.setValue(player.personalPseudo ?? '')
        this.canonicalPseudo = player.creatorPseudo ?? player.pseudo
        this.personalPseudoSaving = false
        this.playerListService.invalidateCache()
        this.store.dispatch(new CancelMatchCreation())
        this.snackBar.open('Pseudo personnel enregistré', 'Fermer', { duration: 5000 })
        this.changeDetectorRef.markForCheck()
      },
      error: () => {
        if (version !== this.personalPseudoRequestVersion) return
        this.personalPseudoSaving = false
        this.personalPseudoError = "Impossible d'enregistrer votre pseudo personnel."
        this.changeDetectorRef.markForCheck()
      },
    })
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
    if (!this.isEditable || this.playerEditorForm.invalid || this.saving || this.joining || this.mergeLoading || this.personalPseudoSaving) return
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
