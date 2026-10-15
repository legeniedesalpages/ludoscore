import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from 'src/environments/environment'

export interface BackVersion {
    version: string
    buildDate: string | null
}

@Injectable({ providedIn: 'root' })
export class VersionService {

    constructor(private http: HttpClient) { }

    public getBackVersion(): Observable<BackVersion> {
        return this.http.get<BackVersion>(`${environment.apiURL}/api/version`)
    }
}
