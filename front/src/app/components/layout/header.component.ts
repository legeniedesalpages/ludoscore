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
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

  public title = environment.title;
  public username!: string;

  constructor(private authService: AuthService, private router: Router) {
  }

  ngOnInit() {
    
    if (this.authService.isAuthenticated()) {
      let user = this.authService.getAuthenticatedUser();
      this.username = user!.name;
    } else {
      this.router.navigate(['/login']);
    }
  }

  onClickLogout() {
    this.authService.logout().then(() => {
      this.username = '';
      this.router.navigate(['/login']);
    });
  }

  onClickHome() {
    this.router.navigate(['/']);
  }

}
