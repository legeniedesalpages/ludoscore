/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 13/12/2022 - 11:54:51
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 13/12/2022
    * - Author          : renau
    * - Modification    : 
**/
import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppComponent } from '../app.component';
import { User } from '../model/user';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  hidePassword: boolean;
  loginForm: FormGroup;
  errors: boolean;
  errorMessage: any;
  loading: boolean;

  constructor(private authService: AuthService, private router: Router, private appComponent: AppComponent) {

    this.hidePassword = true;
    

    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.email, Validators.required]),
      password: new FormControl('', Validators.required),
    });

    this.errors = false;
    this.errorMessage = null;
    this.loading = false;
  }

  onSubmit() {
    console.warn("submitting login form");
    this.loading = true;
    this.errors = false;
    this.errorMessage = null;

    this.authService.login(this.loginForm.value['email'], this.loginForm.value['password'])
      .then((res: any) => {

        this.authService.setAuthenticated(new User(res.body.id, res.body.name))
        this.appComponent.setUserName(res.body.name)
        this.loading = false;
        this.router.navigate(['/']);

      }, (err: any) => {
        
        if (err.status != 401) {
          this.errorMessage = err.message;
        } else {
          this.errorMessage = 'Email et/ou mot de passe incorrect'
        }
        this.loading = false;
        this.errors = true;
      });
  }
}
