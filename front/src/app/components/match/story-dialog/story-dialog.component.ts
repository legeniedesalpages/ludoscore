import { HttpErrorResponse } from '@angular/common/http'
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { finalize } from 'rxjs'
import { MatchService } from 'src/app/core/services/match/match.service'

@Component({
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  selector: 'app-story-dialog',
  template: `
    <h2 mat-dialog-title>L'histoire de la partie</h2>
    <mat-dialog-content [attr.aria-busy]="loading()">
      @if (loading()) {
        <div class="loading" role="status">
          <mat-spinner [diameter]="32" aria-hidden="true" />
          <p>Le récit de votre partie prend forme…</p>
        </div>
      } @else if (error(); as message) {
        <p role="alert">{{ message }}</p>
        <p>Vous pourrez aussi générer le récit depuis l'historique.</p>
        <button mat-stroked-button type="button" (click)="generate()">Réessayer</button>
      } @else {
        <p class="story-text">{{ story() }}</p>
        <small>Récit conservé dans l'historique de la partie.</small>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button mat-dialog-close type="button" [disabled]="loading()">OK</button>
    </mat-dialog-actions>
  `,
  styles: `
    .loading {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .story-text {
      white-space: pre-line;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }
  `,
})
export class StoryDialogComponent implements OnInit {
  private readonly data = inject<{ matchId: number }>(MAT_DIALOG_DATA)
  private readonly matchService = inject(MatchService)
  private readonly destroyRef = inject(DestroyRef)

  public readonly loading = signal(false)
  public readonly story = signal<string | null>(null)
  public readonly error = signal<string | null>(null)

  ngOnInit(): void {
    this.generate()
  }

  public generate(): void {
    if (this.loading() || this.story()) {
      return
    }
    this.loading.set(true)
    this.error.set(null)
    this.matchService.generateMatchStory(this.data.matchId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: story => this.story.set(story),
      error: (error: unknown) => {
        console.error('Impossible de générer le récit de la partie', error)
        this.error.set(error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'Le récit est indisponible pour le moment. Les scores sont enregistrés. Vous pouvez réessayer.')
      }
    })
  }
}
