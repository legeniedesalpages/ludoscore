/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 11:10:47
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngxs/store';
import { tap } from 'rxjs/operators';
import { AuthState } from '../../state/auth/auth.state';

@Injectable({ providedIn: 'root' })
export class AuthGuardService {

  constructor(private router: Router, private store: Store) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot) {

    return this.store.select(AuthState.isAuthenticated).pipe(
      tap(isAuthenticated => {
        if (isAuthenticated) {
          console.debug(`Authenticated, can show this page: ${state.url}`)
        } else {
          console.warn(`Not authenticated for page /${next.url}, redirect to login page`)
          this.router.navigate(['login']);
        }
      })
    )
  }
}