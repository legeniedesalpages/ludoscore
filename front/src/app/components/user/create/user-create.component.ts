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
import { Component, OnInit } from '@angular/core'
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Navigate } from '@ngxs/router-plugin'
import { Store } from '@ngxs/store'
import { first } from 'rxjs'
import { AuthService } from 'src/app/core/services/auth/auth.service'

@Component({
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css'],
  standalone: false
})
export class UserCreateComponent implements OnInit {

  public readonly registerForm: FormGroup

  public loading: boolean
  public hidePassword: boolean

  constructor(private authServie: AuthService, private store: Store, private formBuilder: FormBuilder, private snackBar: MatSnackBar) {

    this.hidePassword = true

    this.registerForm = this.formBuilder.group(
      {
        email: new FormControl('', [Validators.email, Validators.required]),
        password: ['', Validators.required],
        confirmPassword: ['', Validators.required]
      },
      {
        validators: this.matchValidator('password', 'confirmPassword')
      }
    )

    this.loading = false
  }

  ngOnInit(): void {
    console.debug('Show register page')
  }
  
  public onSubmit() {
    console.info("submitting login form")
    this.loading = true
    this.authServie.createUser(this.registerForm.value.email, this.registerForm.value.password).pipe(first()).subscribe({
      next: () => {
        this.loading = false
        this.snackBar.open("Compte créé, un email de confirmation a été envoyé (il est probablement dans les SPAM)", 'Fermer', {
          duration: 10000
        })
        this.store.dispatch(new Navigate(['/']))
      },
      error: (err) => {
        console.error("Error while creating user", err)
        this.snackBar.open("Erreur lors de la création du compte: " + err, 'Fermer', {
          duration: 5000
        })
        this.loading = false
      }
    })
  }

  matchValidator(controlName: string, matchingControlName: string): ValidatorFn {
    return (abstractControl: AbstractControl) => {
        const control = abstractControl.get(controlName)
        const matchingControl = abstractControl.get(matchingControlName)

        if (matchingControl!.errors && !matchingControl!.errors?.['confirmedValidator']) {
            return null
        }

        if (control!.value !== matchingControl!.value) {
          const error = { confirmedValidator: 'Passwords do not match.' }
          matchingControl!.setErrors(error)
          return error
        } else {
          matchingControl!.setErrors(null)
          return null
        }
    }
  }
}
