/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 10:58:08
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { mergeMap } from 'rxjs/operators';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../model/user.model';
import { UserRegistration } from '../model/userRegistration.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly csrfUrl = environment.apiURL + '/sanctum/csrf-cookie'
  private readonly loginUrl = environment.apiURL + '/api/auth/login';
  private readonly logoutUrl = environment.apiURL + '/api/auth/logout';
  private readonly userUrl = environment.apiURL + '/api/users';
  private readonly registerUrl = environment.apiURL + '/api/auth/registers';  

  constructor(private http: HttpClient) {
  }

  public login(email: string, password: string): Promise<User> {

    return new Promise((resolve: any, reject) => {

      // first request CSRF
      this.http.get(this.csrfUrl).pipe(
        // second request : authentication
        mergeMap(() => this.http.post(this.loginUrl, { email: email, password: password })),
        // third and last request : retrieve user details
        mergeMap((result: any) => this.http.get(this.userUrl + '/' + result.id))

      ).subscribe({

        next(user) {
          console.info("Login successful")
          localStorage.setItem('access_token', JSON.stringify(user))
          resolve(user)
        },

        error() {
          console.warn("Login failed")
          reject("Login failed")
        }
      })
    });
  }

  public logout(): Promise<string> {

    localStorage.removeItem('access_token')

    return new Promise(resolve => {
      this.http.get(this.logoutUrl).subscribe(() => {
        resolve("logged out")
      })
    });
  }

  public isAuthenticated(): boolean {
    if (!localStorage.getItem('access_token')) {
      return false;
    }
    return true;
  }

  public getAuthenticatedUser(): User | undefined {
    if (!this.isAuthenticated()) {
      return undefined;
    }
    return JSON.parse(localStorage.getItem('access_token') || '{}')
  }

  public register(userRegistration: UserRegistration): Observable<UserRegistration> {

    return this.http.post<UserRegistration>(this.registerUrl, userRegistration).pipe(
        map(res => {
            console.info("User registered")
            return res
        })
    );
}
}
