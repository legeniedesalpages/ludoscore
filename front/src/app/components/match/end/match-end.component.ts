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
import { Component, inject, OnInit, signal } from '@angular/core'
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
import { Actions, ofActionCompleted, ofActionErrored, Store } from '@ngxs/store'
import { Observable } from 'rxjs'
import { MatchModel, Team } from 'src/app/core/model/match.model'
import { MatchAborted, MatchContinued, SaveMatchResult, SetWinningTeam } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'
import { ConfirmationDialogComponent } from '../../layout/dialogue/confirmation.component'
import { LayoutComponent } from '../../layout/layout.component'
import { SidenavModule } from '../../layout/sidenav/sidenav.module'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { ActivatedRoute } from '@angular/router'


@Component({
  templateUrl: './match-end.component.html',
  styleUrls: ['./match-end.component.css'],
  imports: [
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

  private store: Store = inject(Store)
  private actions: Actions = inject(Actions)
  private snackBar: MatSnackBar = inject(MatSnackBar)
  private dialog: MatDialog = inject(MatDialog)
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute)


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

    this.activatedRoute.queryParams.subscribe((params: { [x: string]: any }) => {
      this.typeDeSaisie.set(params['mode'] || 'player');
    });
    
    this.actions.pipe(ofActionErrored(SaveMatchResult)).subscribe(_ => {
      this.snackBar.open("Erreur lors de l'enregistrement de la partie", 'Fermer', {
        duration: 10000
      })
    })

    this.actions.pipe(ofActionCompleted(SaveMatchResult)).subscribe(() => {
      this.saving = false
      this.snackBar.open("Partie enregistrée ! à bientôt sur Ludoscore ;-)", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/']))
    })

    this.actions.pipe(ofActionCompleted(MatchAborted)).subscribe(() => {
      this.saving = false
      this.snackBar.open("Partie abandonnée !", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/']))
    })

    this.actions.pipe(ofActionCompleted(MatchContinued)).subscribe(() => {
      this.saving = false
      this.snackBar.open("Reprise de la partie !", 'Fermer', {
        duration: 5000
      })
      this.store.dispatch(new Navigate(['/match-display']))
    })
  }

  public selectWiningTeam(team: Team) {
    console.log("choose wining team", team)
    this.saving = true
    this.store.dispatch(new SetWinningTeam(team)).subscribe(_ => this.saving = false)
  }

  public setTeamScore(team: Team) {
    this.store.dispatch(new Navigate(['/team-score-by-player'], { "id": team.id }))
  }

  public setCategoryScore(index: number) {
    this.store.dispatch(new Navigate(['/team-score-by-category'], { "index": index }))
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
      this.saving = true
      this.store.dispatch(new SaveMatchResult()).subscribe(_ => this.saving = false)
    } else {
      // Certaines équipes n'ont pas de score, demander confirmation
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          message: "Tous les scores n'ont pas été saisis, cliquez sur 'terminer' pour mettre fin à la partie sans avoir enregistré tous les scores."
        }
      });

      dialogRef.afterClosed().subscribe((result: boolean) => {
        if (result) {
          this.saving = true;
          this.store.dispatch(new SaveMatchResult()).subscribe(_ => this.saving = false);
        }
      });
    }
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
