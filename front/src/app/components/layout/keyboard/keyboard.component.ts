/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 19/07/2025 - 01:39:19
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 19/07/2025
    * - Author          : renau
    * - Modification    : 
**/
/**
    * @description      : 
    * @            <div class="row">
                <div class="key" matRipple (mousedown)="handleKey($event, '(')"><button mat-raised-button class="visual grey">(</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '0')"><button mat-raised-button class="visual">0</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, ')')"><button mat-raised-button class="visual grey">)</button></div>
                <div class="key double" matRipple (mousedown)="handleKey($event, 'Enter')"><button mat-flat-button class="visual primary"><mat-icon>subdirectory_arrow_left</mat-icon></button></div>
            </div>           : renau
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
import { Component, input, output, QueryList } from '@angular/core'

import { MatButtonModule } from '@angular/material/button'
import { MatRippleModule } from '@angular/material/core'
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
                <div class="key" matRipple (mousedown)="handleKey($event, '(')"><button mat-raised-button class="visual grey">(</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, '0')"><button mat-raised-button class="visual">0</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, ')')"><button mat-raised-button class="visual grey">)</button></div>
                <div class="key" matRipple (mousedown)="handleKey($event, 'Enter')"><button mat-flat-button class="visual primary"><mat-icon>subdirectory_arrow_left</mat-icon></button></div>
            </div>
        </div>
    `,
    styleUrls: ['./keyboard.component.css'],
    imports: [
        CommonModule,
        MatButtonModule,
        MatIcon,
        MatRippleModule
    ]
})
export class KeyboardComponent {

    listOfInput = input.required<QueryList<any>>()
    onSubmit = output()

    public handleKey(event: any, key: any) {
        const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement

        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const cursor = activeElement.selectionStart || 0

            if (key === 'Backspace') {
                if (cursor > 0) {
                    activeElement.value = activeElement.value.substring(0, cursor - 1) + activeElement.value.substring(cursor)
                    activeElement.selectionStart = cursor - 1
                    activeElement.selectionEnd = cursor - 1
                }
            } else if (key === 'Enter') {

                if (this.listOfInput() && this.listOfInput()!.length > 0) {

                    for (let i = 0; i < this.listOfInput().length; i++) {
                        const elt = this.listOfInput()!.toArray()[i]
                        
                        if (typeof elt.getInputNativeElement === 'function') {
                            if (elt.getInputNativeElement() == activeElement) {
                                if (i + 1 < this.listOfInput().length) {
                                    this.listOfInput()!.toArray()[i + 1].getInputNativeElement().focus()
                                } else {
                                    console.debug("submitting form wrapped")
                                    this.onSubmit.emit()
                                }
                            }
                        } else {
                            if (elt.nativeElement == activeElement) {
                                if (i + 1 < this.listOfInput().length) {
                                    this.listOfInput()!.toArray()[i + 1].nativeElement.focus()
                                } else {
                                    console.debug("submitting form native")
                                    this.onSubmit.emit()
                                }
                            }
                        }
                    }
                } else {
                    console.debug("submitting form, no list of input")
                    this.onSubmit.emit()
                }
            } else {
                // Insérer le caractère à la position du curseur
                activeElement.value = activeElement.value.substring(0, cursor) + key + activeElement.value.substring(cursor)
                activeElement.selectionStart = cursor + 1
                activeElement.selectionEnd = cursor + 1
            }

            // Déclencher l'événement input pour que Angular détecte le changement
            activeElement.dispatchEvent(new Event('input', { bubbles: true }))
        }

        event.preventDefault()
    }
}