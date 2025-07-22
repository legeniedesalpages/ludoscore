/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/07/2025 - 00:16:47
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/07/2025
    * - Author          : renau
    * - Modification    : 
**/
import { Component, computed, input, OnInit, output, signal } from "@angular/core"
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatIconModule } from "@angular/material/icon"
import { MatInputModule } from "@angular/material/input"
import { Team } from "src/app/core/model/match.model"
import { Score, ScoreTag } from "src/app/core/model/score.model"
import { ArithmeticExpressionEvaluator } from "src/app/core/services/misc/arithmetic"
import { Md5 } from 'ts-md5'

@Component({
    selector: "ls-input-category-score",
    template: `
        <div class="complex-group" [formGroup]="myFormGroup()">
            <div [class]="scoreTag().complex ? 'field complex' : 'field simple'">
                <mat-form-field appearance="fill">
                    <mat-label><ng-content></ng-content><small>(score: <b>{{ calculatedValue() }}</b>)</small></mat-label>
                    @if(scoreTag().complex) {
                        <textarea 
                            matInput
                            [formControlName]="team().name"
                            inputmode='none' 
                            [class]="classTeam() + ' ' + classCategory()"
                            (ngModelChange)="onChange()"
                        ></textarea>
                    } @else {
                        <input 
                            matInput
                            [formControlName]="team().name"
                            inputmode='none' 
                            [class]="classTeam() + ' ' + classCategory()"
                            (ngModelChange)="onChange()"
                        >
                    }
                </mat-form-field>
            </div>
        </div>
    `,
    styles: `
        :host {
            display: block;
            width: 90%;
        }
        mat-form-field {
            width: 100%;
           
        }
    `,
    imports: [
        MatIconModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule
    ]
})
export class CategoryComponent implements OnInit {

    scoreTag = input.required<ScoreTag>()
    team = input.required<Team>()
    myFormGroup = input.required<FormGroup>()
    valueChange = output<Score>()
    calculatedValue = signal<number>(0)

    classTeam = computed(() => 'team-' + Md5.hashAsciiStr(this.team()?.name || ''))
    classCategory = computed(() => 'category-' + Md5.hashAsciiStr(this.scoreTag().category))

    ngOnInit(): void {
        const validators = []
        if (this.scoreTag().min != undefined) {
            validators.push(Validators.min(this.scoreTag().min!))
        }
        if (this.scoreTag().max != undefined) {
            validators.push(Validators.max(this.scoreTag().max!))
        }

        if (this.scoreTag().complex) {
            validators.push(Validators.pattern("^[0-9\-\*\/()+]*$"))
        } else {
            validators.push(Validators.pattern("^[0-9]*$"))
        }
        const formControl = new FormControl('', validators)
        formControl.setValue(this.team().scoreDetails.find(s => s.categoryName === this.scoreTag().category)?.inputString ?? '')
        this.myFormGroup().addControl(this.team().name, formControl)
        this.onChange()
    }

    onChange() {
        let value = this.myFormGroup().get(this.team().name)?.value ?? ''
        let localCalculatedValue = 0

        if (this.scoreTag().complex) {
            try {
                const numValue = new ArithmeticExpressionEvaluator().evaluateAll(value, true)
                localCalculatedValue = isNaN(numValue) ? 0 : numValue
            } catch {
                this.myFormGroup().get(this.team().name)?.setErrors({ message: 'arithmetic exception' })
            }
        } else {
            try {
                const numValue = Number(value);
                localCalculatedValue = isNaN(numValue) ? 0 : numValue
            } catch {
            }
        }

        this.calculatedValue.set(localCalculatedValue)
        this.valueChange.emit({
            categoryName: this.scoreTag().category,
            value: localCalculatedValue,
            inputString: value
        })
    }


    public getInputNativeElement(): HTMLInputElement | HTMLTextAreaElement {
        if (this.scoreTag().complex) {
            return document.querySelector(`textarea.${this.classTeam()}.${this.classCategory()}`)!
        } else {
            return document.querySelector(`input.${this.classTeam()}.${this.classCategory()}`)!
        }
    }
}
