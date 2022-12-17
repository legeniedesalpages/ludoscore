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

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {  /**
   * Constructor
   * @param router The router object
   */
  constructor(private router: Router) {
  }

  /**
   * Can activate function
   * @param next The activated route snapshot object
   * @param state The router state snapshot object
   */
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    if (localStorage.getItem('access_token')) {
      console.log('Token, donc ok')
      return true;
    }
    localStorage.removeItem('Pas de token, donc login');
    this.router.navigateByUrl('/login');
    return false;
  }
}