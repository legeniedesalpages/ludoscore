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
import { environment } from 'src/environments/environment';
import { User } from '../model/user';

@Injectable({ providedIn: 'root' })
export class AuthService {

  csrfUrl = environment.apiURL + '/sanctum/csrf-cookie'
  loginUrl = environment.apiURL + '/api/auth/login';
  logoutUrl = environment.apiURL + '/api/auth/logout';
  userUrl = environment.apiURL + '/api/users';

  constructor(private http: HttpClient) {
  }

  login(email: string, password: string) {

    return new Promise((resolve, reject) => {
      this.http.get(this.csrfUrl).pipe(
        mergeMap(() => this.http.post(this.loginUrl, { email: email, password: password })),
        mergeMap((result: any) => this.http.get(this.userUrl + '/' + result.id))
      ).subscribe({

        next(value) {
          console.info("Login successful")
          resolve(value);
        },

        error(value) {
          console.warn("Login failed")
          reject(value);
        }
      })
    });
  }

  logout() {
    return new Promise((resolve, reject) => {
      this.http.get(this.logoutUrl).subscribe(res => {
        localStorage.removeItem('access_token');
        resolve(res);
      })
    });
  }

  setAuthenticated(user: User) {
    console.debug('Authenticated, username: ' + user.name);
    localStorage.setItem('access_token', JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    if (!localStorage.getItem('access_token')) {
      return false;
    }
    return true;
  }

  getAuthenticatedUser(): User | undefined {
    if (!this.isAuthenticated()) {
      return undefined;
    }
    return JSON.parse(localStorage.getItem('access_token') || '{}')
  }
}
