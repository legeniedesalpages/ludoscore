/**
    * @description      :
    * @author           : renau
    * @group            :
    * @created          : 19/12/2022 - 11:27:36
    *
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/12/2022
    * - Author          : renau
    * - Modification    :
**/
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { Router } from '@angular/router';
import { first } from 'rxjs';
import { AuthService } from 'src/app/core/services/auth/auth.service';

@Component({
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css'],
})
export class UserCreateComponent implements OnInit {

  public readonly registerForm: FormGroup

  public loading: boolean

  constructor(private authServie: AuthService, private router: Router) {
    this.registerForm = new FormGroup({
      email: new FormControl('', [Validators.email, Validators.required]),
      password: new FormControl('', Validators.required),
    });

    this.loading = false
  }

  ngOnInit(): void {
    console.debug('Show register page')
  }
  
  public onSubmit() {
    console.info("submitting login form")
    this.loading = true
    this.authServie.createUser(this.registerForm.value.email, this.registerForm.value.password).pipe(first()).subscribe(() => {
      this.loading = false
      this.router.navigate(['/']);
    })
  }
}
