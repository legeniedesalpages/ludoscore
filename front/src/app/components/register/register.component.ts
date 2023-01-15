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
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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

  constructor(private authService: AuthService, private router: Router, private http: HttpClient) {
    this.hidePassword = true;

    this.registerForm = new FormGroup({
      name: new FormControl('', []),
      email: new FormControl('', []),
      password: new FormControl('', []),
      confirmPassword: new FormControl('', []),
      recaptchaField: new FormControl('', [])
    });

    this.errors = false;
    this.errorMessage = null;
    this.loading = false;
  }

  ngOnInit(): void {
    console.debug('Show register page');
  }

  public onSubmit() {
    console.info("submitting register form");
    this.loading = true;
    this.errors = false;
    this.errorMessage = null;

    console.debug(`Token [${this.registerForm.get('recaptchaField')?.value}] generated`);
    let token = this.registerForm.get('recaptchaField')?.value
  }
}
