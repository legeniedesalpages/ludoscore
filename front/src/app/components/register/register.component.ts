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
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  public readonly registerForm: FormGroup;
  
  public hidePassword: boolean;
  public errors: boolean;
  public errorMessage: any;
  public loading: boolean;

  constructor(private authService: AuthService, private router: Router, private recaptchaV3Service: ReCaptchaV3Service) {
    this.hidePassword = true;

    this.registerForm = new FormGroup({
      email: new FormControl('', [Validators.email, Validators.required]),
      password: new FormControl('', Validators.required),
      confirmPassword: new FormControl('', Validators.required),
    });

    this.errors = false;
    this.errorMessage = null;
    this.loading = false;
  }

  ngOnInit(): void {
    console.debug('Show login page');
  }

  public onSubmit() {
    console.info("submitting login form");
    this.loading = true;
    this.errors = false;
    this.errorMessage = null;

    this.authService.login(this.registerForm.value['email'], this.registerForm.value['password'])
      .then(() => {

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
