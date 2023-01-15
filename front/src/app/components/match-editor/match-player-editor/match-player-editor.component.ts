/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 10/01/2023 - 00:06:52
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 10/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import { Tag } from 'src/app/core/model/tag.model';
import { startWith, catchError, map } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Observable } from 'rxjs';

    

@Component({
    selector: 'match-player-editor',
    templateUrl: './match-player-editor.component.html',
    styleUrls: ['./match-player-editor.component.css']
})
export class MatchPlayerEditorComponent implements OnInit {

    public tags: Tag[] = []
    public tagsValue: Tag[] = [{ name: "un"}, {name: "deux"}]

    categoriesControl = new FormControl([]);
    categories: string[] = ['Laravel','Angular', 'NPM', 'Jquery', 'PHP'];

    ngOnInit(): void {
    }

    public createPlayer() {
        console.info("Create player")
    }

    visible: boolean = true;
    selectable: boolean = true;
    removable: boolean = true;
    addOnBlur: boolean = false;
  
    separatorKeysCodes = [ENTER, COMMA];
  
    fruitCtrl = new FormControl();
  
    filteredFruits: Observable<any[]>;
  
    fruits : string[] = [];
  
    allFruits = [
      'Apple',
      'Lemon',
      'Lime',
      'Orange',
      'Strawberry'
    ];
  
    @ViewChild('fruitInput') fruitInput!: ElementRef;
  
    constructor() {
      this.filteredFruits = this.fruitCtrl.valueChanges.pipe(
          startWith(null),
          map((fruit: string | null) => fruit ? this.filter(fruit) : this.allFruits.slice()));
    }
  
    add(event: MatChipInputEvent): void {
      const input = event.input;
      const value = event.value;
  
      // Add our fruit
      if ((value || '').trim()) {
        this.fruits.push(value.trim());
      }
  
      // Reset the input value
      if (input) {
        input.value = '';
      }
  
      this.fruitCtrl.setValue(null);
    }
  
    remove(fruit: any): void {
      const index = this.fruits.indexOf(fruit);
  
      if (index >= 0) {
        this.fruits.splice(index, 1);
      }
    }
  
    filter(name: string) {
      return this.allFruits.filter(fruit =>
          fruit.toLowerCase().indexOf(name.toLowerCase()) === 0);
    }
  
    selected(event: any): void {
      this.fruits.push(event.option.viewValue);
      this.fruitInput.nativeElement.value = '';
      this.fruitCtrl.setValue(null);
    }
}