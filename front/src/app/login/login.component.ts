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
import { FormControl, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(private authService: AuthService, private router: Router) {

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

        console.log(res);
        //localStorage.setItem('access_token', res.token);
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
