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
import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { mergeMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { User } from '../../model/user.model';
import { UserCrudService } from '../crud/user-crud.service';
import { Actions, ofActionDispatched, ofActionSuccessful } from '@ngxs/store';
import { LoggedIn, LoggedOut } from '../../state/auth/auth.actions';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnInit {

  private readonly csrfUrl = environment.apiURL + '/sanctum/csrf-cookie'
  private readonly loginUrl = environment.apiURL + '/api/auth/login';
  private readonly logoutUrl = environment.apiURL + '/api/auth/logout';

  constructor(private http: HttpClient, private userCrudService: UserCrudService, private actions: Actions, private router: Router) {
    this.actions.pipe(ofActionSuccessful(LoggedIn)).subscribe(() => this.router.navigate(['/']))
    this.actions.pipe(ofActionDispatched(LoggedOut)).subscribe(() => this.router.navigate(['/login']))
  }

  ngOnInit(): void {
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
    return this.http.get<string>(this.logoutUrl).pipe(tap(_ => console.info("Utilisateur déconnecté")))
  }
}
