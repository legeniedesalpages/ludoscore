/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 09/07/2024 - 10:56:21
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 09/07/2024
    * - Author          : renau
    * - Modification    : 
**/
import { ElementRef } from "@angular/core"
import { timer } from "rxjs"

export function focusAndOpenKeyboard(element: ElementRef<HTMLInputElement>) {
    if (!element) {
      return
    }
  
    const tempElement = document.createElement('input')
    tempElement.style.position = 'absolute'
    tempElement.style.top = (element.nativeElement.offsetTop + 7) + 'px'
    tempElement.style.left = element.nativeElement.offsetLeft + 'px'
    tempElement.style.height = '0'
    tempElement.style.opacity = '0'
    document.body.appendChild(tempElement)
    tempElement.focus()
  
    timer(100).subscribe(() => {
      element.nativeElement.focus()
      element.nativeElement.click()
      document.body.removeChild(tempElement)
    })
  }