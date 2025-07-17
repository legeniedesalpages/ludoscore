/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 14/07/2024 - 23:17:57
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 14/07/2024
    * - Author          : renau
    * - Modification    : 
**/
import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, Output, QueryList } from '@angular/core'

import { MatButtonModule } from '@angular/material/button'
import { MatIcon } from '@angular/material/icon'

@Component({
    selector: 'app-keyboard',
    template: `
        <div class="keyboard">
            <div class="row">        
                <div class="key" matRipple (mousedown)="handleKey($event, '1')"><button mat-raised-button class="visual">1</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '2')"><button mat-raised-button class="visual">2</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '3')"><button mat-raised-button class="visual">3</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '-')"><button mat-raised-button class="visual grey">-</button></div>
            </div>
            <div class="row">
                <div class="key" matRipple (mousedown)="handleKey($event, '4')"><button mat-raised-button class="visual">4</button></div>        
                <div class="key" matRipple (mousedown)="handleKey($event, '5')"><button mat-raised-button class="visual">5</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '6')"><button mat-raised-button class="visual">6</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '+')"><button mat-raised-button class="visual accent">+</button></div>
            </div>
            <div class="row">
                <div class="key" matRipple (mousedown)="handleKey($event, '7')"><button mat-raised-button class="visual">7</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '8')"><button mat-raised-button class="visual">8</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '9')"><button mat-raised-button class="visual">9</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, 'Backspace')"><button mat-raised-button class="visual grey"><mat-icon>backspace</mat-icon></button></div>                
            </div>
            <div class="row">
                <div class="key" matRipple (mousedown)="handleKey($event, '()')"><button mat-raised-button class="visual grey">(</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '0')"><button mat-raised-button class="visual">0</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, ')')"><button mat-raised-button class="visual grey">)</button></div>
                <div class="key double" matRipple (mousedown)="handleKey($event, 'Enter')"><button mat-flat-button class="visual primary"><mat-icon>subdirectory_arrow_left</mat-icon></button></div>
            </div>
        </div>
    `,
    styleUrls: ['./keyboard.component.css'],
    imports: [
        CommonModule,
        MatButtonModule,
        MatIcon
    ]
})
export class KeyboardComponent {

    @Input() public listOfInput!: QueryList<any>
    @Output() public keyPressAction = new EventEmitter<void>
    @Output() public submitAction = new EventEmitter<void>

    public handleKey(event: any, key: any) {
        if (document.activeElement instanceof HTMLInputElement) {
            this.key(key, document.activeElement as HTMLInputElement)
        } else if (document.activeElement instanceof HTMLTextAreaElement) {
            this.key(key, document.activeElement as HTMLTextAreaElement)
        }
        event.preventDefault()
    }

    private key(caracter: any, inputElement: HTMLInputElement | HTMLTextAreaElement) {

        const cursor = inputElement.selectionStart!
        if (caracter == "Backspace") {
            if (cursor > 0) {
                inputElement.value = inputElement.value.substring(0, cursor - 1) + inputElement.value.substring(cursor)
                inputElement.selectionStart = cursor - 1
                inputElement.selectionEnd = cursor - 1
                // Déclencher la mise à jour après suppression
                this.keyPressAction.emit()
            }

        } else if (caracter == "Enter") {

            if (this.listOfInput && this.listOfInput.length > 0) {
                for (let i = 0; i < this.listOfInput.length; i++) {
                    if (this.listOfInput.toArray()[i].nativeElement == inputElement) {
                        if (i + 2 < this.listOfInput.length) {
                            this.listOfInput.toArray()[i + 1].nativeElement.focus()
                        } else {
                            this.submitAction.emit()
                        }
                    }
                }
            }


        } else {
            inputElement.value = inputElement.value.substring(0, cursor) + caracter + inputElement.value.substring(cursor)
            inputElement.selectionStart = cursor + 1
            inputElement.selectionEnd = cursor + 1
            // Déclencher la mise à jour après ajout de caractère
            this.keyPressAction.emit()
        }
    }
}