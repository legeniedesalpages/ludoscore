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
import { mergeMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../../model/user.model';
import { UserCrudService } from '../crud/user-crud.service';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly csrfUrl = environment.apiURL + '/sanctum/csrf-cookie'
  private readonly loginUrl = environment.apiURL + '/api/auth/login';
  private readonly logoutUrl = environment.apiURL + '/api/auth/logout';
  private readonly registerUrl = environment.apiURL + '/api/auth/register';
  private readonly confirmrUrl = environment.apiURL + '/api/auth/confirm';


  constructor(private http: HttpClient, private userCrudService: UserCrudService) {
  }

  public login(email: string, password: string): Observable<User> {

    // first request CSRF
    return this.http.get(this.csrfUrl).pipe(
      // second request : authentication
      mergeMap(() => this.http.post<number>(this.loginUrl, { email: email, password: password })),
      // third and last request : retrieve user details
      mergeMap(id => this.userCrudService.findOne(id)),
      tap(user => console.info("Utilisateur connecté", user))
    )
  }

  public logout(): Observable<string> {
    return this.http.get<string>(this.logoutUrl).pipe(tap(() => console.info("Utilisateur déconnecté")))
  }

  public createUser(email: string, password: string) {
    return this.http.get(this.csrfUrl).pipe(
      mergeMap(() => this.http.post(this.registerUrl, {
        email: email,
        password: password
      })))
  }

  public confirmUser(key: string) {
    return this.http.get(this.csrfUrl).pipe(
      mergeMap(() => this.http.post(this.confirmrUrl, {
        key: key
      })))
  }
}
