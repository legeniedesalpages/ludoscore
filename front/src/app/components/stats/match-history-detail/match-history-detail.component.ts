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
import { CommonModule, NgStyle } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog } from '@angular/material/dialog'
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog.component'
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, RouterModule } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { BehaviorSubject, catchError, combineLatest, filter, finalize, of, switchMap } from 'rxjs'
import { DomSanitizer, SafeUrl } from '@angular/platform-browser'
import { LoadingSpinnerModule } from 'src/app/components/layout/spinner/loading-spinner.module'
import { MatchModel } from 'src/app/core/model/match.model'
import { expansionTitles } from 'src/app/core/utils/game-expansions'
import { Score } from 'src/app/core/model/score.model'
import { MatchFormatterService } from 'src/app/core/services/match/match-formatter.service'
import { MatchService } from 'src/app/core/services/match/match.service'
import { resizeImage } from 'src/app/core/utils/image-resize'
import { determineWinner } from 'src/app/core/utils/winner'
import { LayoutComponent } from '../../layout/layout.component'

const SERVER_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?/

// Les dates du serveur sont naïves ("YYYY-MM-DD HH:mm:ss", fuseau de l'application) : on les relit telles quelles
function toInputValue(value: Date | string | undefined | null): string {
  if (!value) {
    return ''
  }
  if (typeof value === 'string') {
    const parts = SERVER_DATE_PATTERN.exec(value)
    if (parts) {
      return `${parts[1]}T${parts[2]}:${parts[3] ?? '00'}`
    }
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toServerValue(value: string | null | undefined): string | null {
  const parts = value ? SERVER_DATE_PATTERN.exec(value) : null
  return parts ? `${parts[1]} ${parts[2]}:${parts[3] ?? '00'}` : null
}

function endAfterStart(group: AbstractControl): ValidationErrors | null {
  const start = toServerValue(group.get('startedAt')?.value)
  const end = toServerValue(group.get('endedAt')?.value)
  return start && end && end < start ? { endBeforeStart: true } : null
}

import { PlayerNamePipe } from 'src/app/core/pipes/player-name.pipe'

@Component({
  templateUrl: './match-history-detail.component.html',
  styleUrls: ['./match-history-detail.component.css', '../../../core/css/list.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
      PlayerNamePipe,
    CommonModule, NgStyle,
    RouterModule, ReactiveFormsModule,
    MatButtonModule, MatCardModule, MatDividerModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    LoadingSpinnerModule,
    LayoutComponent
  ]
})
export class MatchHistoryDetailComponent implements OnInit {

  protected readonly expansionTitles = expansionTitles


  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private matchService = inject(MatchService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  public formatter = inject(MatchFormatterService);

  public matchModel = signal<MatchModel | undefined>(undefined)
  public photoUrl = signal<SafeUrl | null>(null)
  public pendingPhotoUrl = signal<SafeUrl | null>(null)
  public photoRemoved = signal(false)
  public loading: boolean = true
  public editing = signal(false)
  public saving = signal(false)
  public generatingStory = signal(false)
  public storyError = signal<string | null>(null)
  public form?: FormGroup

  private refresh$ = new BehaviorSubject<void>(undefined)
  private pendingPhoto?: Blob
  private rawPendingPhotoUrl?: string
  private rawPhotoUrl?: string
  // Tant que le gagnant correspond au calcul par les scores, il suit les modifications de scores
  private winnerFollowsScores = false
  private sanitizer = inject(DomSanitizer)
  private changeDetectorRef = inject(ChangeDetectorRef)

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.refresh$]).pipe(
      switchMap(([params]) => this.matchService.getMatch(Number(params.get('id')))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(match => {
      this.matchModel.set(match)
      this.loading = false
      this.changeDetectorRef.markForCheck()
    })

    combineLatest([this.route.paramMap, this.refresh$]).pipe(
      switchMap(([params]) => this.matchService.getMatchPhoto(Number(params.get('id'))).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(blob => {
      this.revokeUrl(this.rawPhotoUrl)
      this.rawPhotoUrl = blob ? URL.createObjectURL(blob) : undefined
      this.photoUrl.set(this.rawPhotoUrl ? this.sanitizer.bypassSecurityTrustUrl(this.rawPhotoUrl) : null)
      this.changeDetectorRef.markForCheck()
    })

    this.destroyRef.onDestroy(() => {
      this.revokeUrl(this.rawPhotoUrl)
      this.revokeUrl(this.rawPendingPhotoUrl)
    })
  }

  private revokeUrl(url?: string) {
    if (url) {
      URL.revokeObjectURL(url)
    }
  }

  public generateStory(): void {
    const match = this.matchModel()
    if (!match?.matchId || match.story || match.running || match.canceled || this.generatingStory()) {
      return
    }
    this.generatingStory.set(true)
    this.storyError.set(null)
    this.matchService.generateMatchStory(match.matchId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.generatingStory.set(false))
    ).subscribe({
      next: story => this.matchModel.update(current =>
        current && current.matchId === match.matchId ? { ...current, story } : current),
      error: (error: unknown) => {
        console.error('Impossible de générer le récit de la partie', error)
        this.storyError.set(error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'Le récit est indisponible pour le moment. Les scores sont enregistrés. Vous pouvez réessayer.')
      }
    })
  }

  public get teamsArray(): FormArray {
    return this.form!.get('teams') as FormArray
  }

  public detailsArray(teamIndex: number): FormArray {
    return this.teamsArray.at(teamIndex).get('details') as FormArray
  }

  // Une équipe saisie par catégories a son total calculé ; sinon le total est saisi directement
  public teamTotal(teamIndex: number): number {
    return this.detailsArray(teamIndex).controls
      .reduce((sum, control) => sum + (Number(control.value) || 0), 0)
  }

  public startEditing() {
    const match = this.matchModel()
    if (!match) {
      return
    }
    this.form = new FormGroup({
      startedAt: new FormControl(toInputValue(match.startedAt), Validators.required),
      endedAt: new FormControl(toInputValue(match.endedAt)),
      winnerTeamId: new FormControl<number | null>(match.winningTeam?.id ?? null),
      status: new FormControl<'running' | 'finished' | 'canceled'>(match.canceled ? 'canceled' : match.running ? 'running' : 'finished'),
      teams: new FormArray(match.teams.map(team => new FormGroup({
        score: new FormControl<number | null>(team.score ?? null, [Validators.min(-32768), Validators.max(32767)]),
        details: new FormArray(team.scoreDetails.map(detail =>
          new FormControl<number | null>(detail.value, [Validators.required, Validators.min(-32768), Validators.max(32767)])))
      })))
    }, { validators: endAfterStart })
    const initialWinnerId = match.winningTeam?.id ?? null
    this.winnerFollowsScores = initialWinnerId === (determineWinner(this.computeTeams(match), match.game.highestScoreWin)?.id ?? null)
    this.teamsArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.winnerFollowsScores && !this.form?.get('winnerTeamId')?.dirty) {
        this.recomputeWinner(false)
      }
    })
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.changeDetectorRef.markForCheck())
    this.resetPendingPhoto()
    this.editing.set(true)
  }

  public cancelEditing() {
    this.editing.set(false)
    this.form = undefined
    this.resetPendingPhoto()
  }

  // Remet le gagnant selon les scores saisis (null si les scores sont incomplets)
  public recomputeWinner(markPristine = true) {
    const match = this.matchModel()
    const control = this.form?.get('winnerTeamId')
    if (!match || !control) {
      return
    }
    control.setValue(determineWinner(this.computeTeams(match), match.game.highestScoreWin)?.id ?? null, { emitEvent: false })
    if (markPristine) {
      control.markAsPristine()
      this.winnerFollowsScores = true
    }
    this.changeDetectorRef.markForCheck()
  }

  public async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) {
      return
    }
    try {
      this.pendingPhoto = await resizeImage(file)
      this.revokeUrl(this.rawPendingPhotoUrl)
      this.rawPendingPhotoUrl = URL.createObjectURL(this.pendingPhoto)
      this.pendingPhotoUrl.set(this.sanitizer.bypassSecurityTrustUrl(this.rawPendingPhotoUrl))
      this.photoRemoved.set(false)
    } catch (error) {
      console.error("Impossible de traiter la photo", error)
      this.snackBar.open("Impossible de traiter cette photo", 'Fermer', { duration: 5000 })
    }
    this.changeDetectorRef.markForCheck()
  }

  public removePhoto() {
    this.pendingPhoto = undefined
    this.revokeUrl(this.rawPendingPhotoUrl)
    this.rawPendingPhotoUrl = undefined
    this.pendingPhotoUrl.set(null)
    this.photoRemoved.set(this.photoUrl() !== null)
  }

  private resetPendingPhoto() {
    this.pendingPhoto = undefined
    this.revokeUrl(this.rawPendingPhotoUrl)
    this.rawPendingPhotoUrl = undefined
    this.pendingPhotoUrl.set(null)
    this.photoRemoved.set(false)
  }

  // Scores des équipes recalculés depuis le formulaire (ou ceux de la partie si aucun formulaire)
  private computeTeams(match: MatchModel) {
    return match.teams.map((team, i) => {
      const hasDetails = team.scoreDetails.length > 0
      const scoreDetails: Score[] = team.scoreDetails.map((detail, j) => {
        const value = Number(this.detailsArray(i).at(j).value)
        if (value === detail.value) {
          return detail
        }
        // Pour une catégorie négative, la valeur saisie à l'origine est positive et le signe est appliqué au calcul
        const negatif = match.game.scoreTags.find(tag => tag.category === detail.categoryName)?.negatif
        return { ...detail, value, inputString: String(negatif ? -value : value) }
      })
      const rawScore = this.teamsArray.at(i).get('score')?.value
      const score = hasDetails
        ? scoreDetails.reduce((sum, detail) => sum + detail.value, 0)
        : (rawScore === null || rawScore === '' ? null : Number(rawScore))
      return { id: team.id!, score, scoreDetails }
    })
  }

  public clearEndDate() {
    this.form?.get('endedAt')?.setValue('')
    this.form?.get('endedAt')?.markAsDirty()
  }

  public save() {
    const match = this.matchModel()
    if (!match || !this.form || this.form.invalid) {
      return
    }

    const updatedTeams = this.computeTeams(match)
    const winnerTeamId: number | null = this.form.get('winnerTeamId')?.value ?? null
    const photoOperation = this.pendingPhoto
      ? this.matchService.uploadMatchPhoto(match.matchId!, this.pendingPhoto)
      : this.photoRemoved() ? this.matchService.deleteMatchPhoto(match.matchId!) : of(undefined)

    this.saving.set(true)
    this.matchService.updateMatchHistory({
      matchId: match.matchId!,
      startedAt: toServerValue(this.form.get('startedAt')?.value)!,
      finishedAt: toServerValue(this.form.get('endedAt')?.value),
      winnerTeamId,
      running: this.form.get('status')?.value === 'running',
      canceled: this.form.get('status')?.value === 'canceled',
      teams: updatedTeams
    }).pipe(switchMap(() => photoOperation)).subscribe({
      next: () => {
        this.saving.set(false)
        this.cancelEditing()
        this.refresh$.next()
        this.snackBar.open("Partie mise à jour", 'Fermer', { duration: 5000 })
      },
      error: error => {
        this.saving.set(false)
        const detail = error?.error?.message ?? error?.message ?? String(error)
        this.snackBar.open("Erreur lors de la mise à jour de la partie : " + detail, 'Fermer', { duration: 10000 })
      }
    })
  }

  public deteleMatchHistory() {
    const matchId = this.matchModel()?.matchId
    if (matchId == undefined) {
      return
    }
    this.dialog.open(ConfirmDeleteDialogComponent).afterClosed().pipe(
      filter(confirmed => confirmed === true),
      switchMap(() => this.matchService.deleteMatch(matchId))
    ).subscribe(() => {
      this.returnToMatchHistory()
    })
  }

  public returnToMatchHistory() {
    this.store.dispatch(new Navigate(['/match-history']))
  }
}
