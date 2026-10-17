import { Component, inject, input, signal } from '@angular/core'
import { form, FormField, maxLength, minLength, required } from '@angular/forms/signals'
import { MatButtonModule } from '@angular/material/button'
import { MatDialog } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { StatsAnswerComponent } from '../stats-answer/stats-answer.component'

@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'app-stats-question',
  styleUrl: './stats-question.component.css',
  templateUrl: './stats-question.component.html',
})
export class StatsQuestionComponent {
  private readonly dialog = inject(MatDialog)
  readonly gameId = input<number>()
  readonly model = signal({ question: '' })
  readonly questionForm = form(this.model, path => {
    required(path.question)
    minLength(path.question, 3)
    maxLength(path.question, 500)
  })

  ask(event: Event): void {
    event.preventDefault()
    if (this.questionForm().invalid() || this.model().question.trim().length < 3) return
    const id = this.gameId()
    this.dialog.open(StatsAnswerComponent, {
      width: '960px', maxWidth: '95vw', maxHeight: '90dvh',
      data: { question: this.model().question.trim(), ...(id !== undefined ? { scope: 'game', id } : {}) },
    })
  }
}
