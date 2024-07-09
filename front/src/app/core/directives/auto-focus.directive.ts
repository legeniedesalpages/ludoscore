/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 09/07/2024 - 12:40:29
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 09/07/2024
    * - Author          : renau
    * - Modification    : 
**/

import { AfterContentInit, Directive, ElementRef } from '@angular/core'

@Directive({
    standalone: true,
    selector: '[autofocus]'
})
export class AutoFocus implements AfterContentInit {

    constructor(private elementRef: ElementRef) { }
    ngAfterContentInit(): void {
        console.debug("Auto focus on element: ", this.elementRef.nativeElement);
        this.elementRef.nativeElement.focus();
        this.elementRef.nativeElement.click();
    }

}
