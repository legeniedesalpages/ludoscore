import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { LayoutComponent } from 'src/app/components/layout/layout.component'
import { NewsletterPreview, NewsletterService } from 'src/app/core/services/stats/newsletter.service'

@Component({
  selector: 'app-newsletter-preview',
  templateUrl: './newsletter-preview.component.html',
  styleUrls: ['./newsletter-preview.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, MatButtonModule, MatIconModule, LayoutComponent],
})
export class NewsletterPreviewComponent implements OnInit {
  private store = inject(Store)
  private newsletterService = inject(NewsletterService)
  private sanitizer = inject(DomSanitizer)
  private changeDetectorRef = inject(ChangeDetectorRef)

  public preview: NewsletterPreview | null = null
  public html: SafeHtml | null = null
  public loading = true
  public error: string | null = null

  ngOnInit(): void {
    this.load(false)
  }

  public load(refresh: boolean): void {
    this.loading = true
    this.error = null
    this.newsletterService.preview(refresh).subscribe({
      next: preview => {
        this.preview = preview
        // Le contenu vient de notre serveur et s'affiche dans un iframe sans droits (sandbox).
        this.html = this.sanitizer.bypassSecurityTrustHtml(preview.html)
        this.loading = false
        this.changeDetectorRef.markForCheck()
      },
      error: err => {
        this.error = err?.status === 403
          ? 'Accès réservé aux administrateurs.'
          : err?.error?.message ?? 'Impossible de charger la newsletter.'
        this.loading = false
        this.changeDetectorRef.markForCheck()
      },
    })
  }

  public returnToHome(): void {
    this.store.dispatch(new Navigate(['/']))
  }
}
