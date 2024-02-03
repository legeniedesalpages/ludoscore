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
import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { DoLogin } from 'src/app/core/state/auth/auth.actions'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  public readonly loginForm: FormGroup

  public hidePassword: boolean
  public errors: boolean
  public errorMessage: any
  public loading: boolean

  constructor(private store: Store, private router: Router) {
   
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.email, Validators.required]),
      password: new FormControl('', Validators.required),
    });

    this.hidePassword = true
    this.errors = false
    this.errorMessage = null
    this.loading = false
  }

  ngOnInit(): void {
    console.debug('Show login page')
  }

  public onSubmit() {
    console.info("submitting login form")
    this.loading = true
    this.errors = false
    this.errorMessage = null

    this.store.dispatch(new DoLogin(
      this.loginForm.value['email'],
      this.loginForm.value['password']
    )).subscribe({
      next: () => {
        //this.store.dispatch(new Navigate(['/']))
        this.router.navigate(['/'])
      },
      error: () => {
        this.errors = true
        this.errorMessage = "login ou mot de passe inccorect"
        this.loading = false
      }
    })
  }
}