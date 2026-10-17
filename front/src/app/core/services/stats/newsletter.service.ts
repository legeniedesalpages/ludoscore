import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from 'src/environments/environment'

export interface NewsletterPreview {
  subject: string
  html: string
  generatedAt: string
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private http = inject(HttpClient)

  preview(refresh = false): Observable<NewsletterPreview> {
    return this.http.get<NewsletterPreview>(`${environment.apiURL}/api/admin/newsletter/preview`, {
      params: refresh ? { refresh: 1 } : {},
    })
  }
}
