/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 12/12/2022 - 23:45:39
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 12/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { User } from './model/user';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  title = environment.title;
  username = '';

  constructor(private authService: AuthService, private router: Router) {
    let user = this.authService.getAuthenticatedUser();
    if (user) {
      this.username = user.name;
    }
  }

  setUserName(name: string) {
    this.username = name;
  }

  onClickLogout() {
    this.username = '';
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }

  onClickHome() {
    this.router.navigate(['/']);
  }

}
