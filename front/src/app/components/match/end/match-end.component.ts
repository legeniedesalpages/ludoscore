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
import { A11yModule } from '@angular/cdk/a11y'
import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatButtonToggleModule } from '@angular/material/button-toggle'
import { MatDialog } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Navigate } from '@ngxs/router-plugin'
import { Actions, ofActionCompleted, ofActionErrored, ofActionSuccessful, Store } from '@ngxs/store'
import { Observable } from 'rxjs'
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { CancelMatchCreation, MatchAborted, MatchContinued, SaveMatchResult, SetWinningTeam } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { ConfirmationDialogComponent } from '../../layout/dialogue/confirmation.component'
import { LayoutComponent } from '../../layout/layout.component'
import { SidenavModule } from '../../layout/sidenav/sidenav.module'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { ActivatedRoute } from '@angular/router'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { MatchService } from 'src/app/core/services/match/match.service'
import { resizeImage } from 'src/app/core/utils/image-resize'
import { GameEditorNavigationService } from 'src/app/core/services/game/game-editor-navigation.service'
import { StoryDialogComponent } from '../story-dialog/story-dialog.component'


import { PlayerNamePipe } from 'src/app/core/pipes/player-name.pipe'

@Component({
  templateUrl: './match-end.component.html',
  styleUrls: ['./match-end.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    PlayerNamePipe,
    CommonModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, 
    MatSelectModule, MatDividerModule, MatButtonToggleModule,
    A11yModule,
    FormsModule,
    SidenavModule, LoadingSpinnerModule,
    LayoutComponent
  ]
})
export class MatchEndComponent implements OnInit {

  public match$: Observable<MatchModel> = inject(Store).select(MatchState.match)
  public saving: boolean = false
  public typeDeSaisie = signal<string>('player')
  public photoUrl?: SafeUrl

  private photo?: Blob
  private savedMatchId?: number
  private rawPhotoUrl?: string
  private sanitizer: DomSanitizer = inject(DomSanitizer)
  private matchService: MatchService = inject(MatchService)

  private store: Store = inject(Store)
  private actions: Actions = inject(Actions)
  private snackBar: MatSnackBar = inject(MatSnackBar)
  private dialog: MatDialog = inject(MatDialog)
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute)
  private changeDetectorRef = inject(ChangeDetectorRef)
  private gameEditorNavigation = inject(GameEditorNavigationService)
  private destroyRef = inject(DestroyRef)


  ngOnInit(): void {

    const match = this.store.selectSnapshot(MatchState.match)
    match.teams.forEach(team => {
      if (!team.scoreDetails) {
        team.scoreDetails = [{
          categoryName: '',
          value: 0,
          inputString: ''
        }];
      }
    });

    this.activatedRoute.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: { [x: string]: any }) => {
      this.typeDeSaisie.set(params['mode'] || 'player');
    });
    
    this.actions.pipe(ofActionErrored(SaveMatchResult), takeUntilDestroyed(this.destroyRef)).subscribe(({ result }) => {
      this.saving = false
      this.changeDetectorRef.markForCheck()
      const error = result.error as any
      const detail = error?.error?.message ?? error?.message ?? String(error)
      const status = error?.status ? ` (HTTP ${error.status})` : ''
      console.error("Erreur lors de l'enregistrement de la partie", error)

      this.snackBar
        .open(`Erreur lors de l'enregistrement de la partie${status} : ${detail}`, 'Réinitialiser la partie', {
          duration: 15000
        })
        .onAction()
        .subscribe(() => {
          this.store.dispatch(new CancelMatchCreation())
          this.store.dispatch(new Navigate(['/']))
        })
    })

    this.actions.pipe(ofActionSuccessful(SaveMatchResult), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.saving = false
      this.changeDetectorRef.markForCheck()
      this.snackBar.open("Partie enregistrée ! à bientôt sur Ludoscore ;-)", 'Fermer', {
        duration: 5000
      })
      const matchId = this.savedMatchId
      // La navigation détruit cet écran ; la popup prend ensuite en charge la génération.
      this.store.dispatch(new Navigate(['/'])).subscribe({
        next: () => this.dialog.open(StoryDialogComponent, {
          data: { matchId },
          width: '640px',
          maxWidth: '95vw',
          disableClose: true,
          autoFocus: 'dialog',
          restoreFocus: false
        }),
        error: (error: unknown) => {
          console.error("Impossible de revenir à l'accueil après l'enregistrement", error)
          this.snackBar.open("Les scores sont enregistrés, mais le retour à l'accueil a échoué. Le récit pourra être généré dans l'historique.", 'Fermer', { duration: 10000 })
        }
      })
    })

    this.actions.pipe(ofActionCompleted(MatchAborted), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.saving = false
      this.changeDetectorRef.markForCheck()
      this.snackBar.open("Partie abandonnée !", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/']))
    })

    this.actions.pipe(ofActionCompleted(MatchContinued), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.saving = false
      this.changeDetectorRef.markForCheck()
      this.snackBar.open("Reprise de la partie !", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/match-display']))
    })
  }

  public selectWiningTeam(team: Team) {
    console.log("choose wining team", team)
    this.saving = true
    this.store.dispatch(new SetWinningTeam(team)).subscribe(_ => {
      this.saving = false
      this.changeDetectorRef.markForCheck()
    })
  }

  public setTeamScore(team: Team) {
    this.store.dispatch(new Navigate(['/team-score-by-player'], { "id": team.id }))
  }

  public setCategoryScore(index: number) {
    const match = this.store.selectSnapshot<MatchModel>(MatchState.match)
    this.store.dispatch(new Navigate(['/team-score-by-category'], { "category": match.game.scoreTags[index].category }))
  }

  public editGameConfiguration(): void {
    const game = this.store.selectSnapshot<MatchModel>(MatchState.match).game
    this.gameEditorNavigation.open(game)
  }

  public endMatch() {
    const match = this.store.selectSnapshot(MatchState.match)

    if (!match) {
      return;
    }

    // Vérifier si toutes les équipes ont un score
    const allTeamsHaveScore = match.teams.every(team => team.score != null && team.score !== undefined)

    if (allTeamsHaveScore) {
      // Toutes les équipes ont un score, terminer directement
      this.save()
    } else {
      // Certaines équipes n'ont pas de score, demander confirmation
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          message: "Tous les scores n'ont pas été saisis, cliquez sur 'terminer' pour mettre fin à la partie sans avoir enregistré tous les scores."
        }
      });

      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (result) {
          this.save()
          this.changeDetectorRef.markForCheck()
        }
      });
    }
  }

  public async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) {
      return
    }

    try {
      this.photo = await resizeImage(file)
      this.setPhotoPreview(URL.createObjectURL(this.photo))
      this.changeDetectorRef.markForCheck()
    } catch (error) {
      console.error("Impossible de traiter la photo", error)
      this.snackBar.open("Impossible de traiter cette photo", 'Fermer', { duration: 5000 })
    }
  }

  public removePhoto() {
    this.photo = undefined
    this.setPhotoPreview(undefined)
  }

  private setPhotoPreview(url?: string) {
    if (this.rawPhotoUrl) {
      URL.revokeObjectURL(this.rawPhotoUrl)
    }
    this.rawPhotoUrl = url
    this.photoUrl = url ? this.sanitizer.bypassSecurityTrustUrl(url) : undefined
  }

  // La photo est envoyée avant le résultat car la sauvegarde réinitialise l'état de la partie
  private save() {
    const matchId = this.store.selectSnapshot(MatchState.match)?.matchId
    this.savedMatchId = matchId
    this.saving = true

    if (!this.photo || matchId == undefined) {
      this.store.dispatch(new SaveMatchResult()).subscribe({
        next: () => {
          this.saving = false
          this.changeDetectorRef.markForCheck()
        },
        error: () => {
          this.saving = false
          this.changeDetectorRef.markForCheck()
        }
      })
      return
    }

    this.matchService.uploadMatchPhoto(matchId, this.photo).subscribe({
      next: () => {
        this.store.dispatch(new SaveMatchResult()).subscribe({
          next: () => {
            this.saving = false
            this.changeDetectorRef.markForCheck()
          },
          error: () => {
            this.saving = false
            this.changeDetectorRef.markForCheck()
          }
        })
      },
      error: error => {
        this.saving = false
        this.changeDetectorRef.markForCheck()
        console.error("Erreur lors de l'envoi de la photo", error)
        this.snackBar.open("Erreur lors de l'envoi de la photo : " + error.message, 'Fermer', { duration: 10000 })
      }
    })
  }

  public abortMatch() {
    this.saving = true
    this.store.dispatch(new MatchAborted())
  }

  public continueMatch() {
    this.saving = true
    this.store.dispatch(new MatchContinued())
  }

  public returnToHome() {
    this.store.dispatch(new Navigate(['/']))
  }

  public onTypeSaisieChange(event: any) {
    this.typeDeSaisie.set(event.value);
  }
}
