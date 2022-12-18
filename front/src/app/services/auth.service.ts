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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { mergeMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  csrfUrl = environment.apiURL + '/sanctum/csrf-cookie'
  loginUrl = environment.apiURL + '/api/auth/login';
  userUrl = environment.apiURL + '/api/users';
  options: any;

  constructor(private http: HttpClient) {
    this.options = {
      headers: new HttpHeaders({
        Accept: 'application/json'
      }),
      withCredentials: true,
      observe: 'response'
    };
  }

  login(email: string, password: string) {

    return new Promise((resolve, reject) => {
      this.http.get(this.csrfUrl, this.options).pipe(
        mergeMap(() => this.http.post(this.loginUrl, { email: email, password: password }, this.options)),
        mergeMap((result: any) => this.http.get(this.userUrl + '/' + result.body.id, this.options))
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
}