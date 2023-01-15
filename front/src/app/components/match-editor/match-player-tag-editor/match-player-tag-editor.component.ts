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
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { Tag } from 'src/app/core/model/tag.model';
import { startWith, map } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Observable } from 'rxjs';

@Component({
  selector: 'match-player-tag-editor',
  templateUrl: './match-player-tag-editor.component.html',
  styleUrls: ['./match-player-tag-editor.component.css']
})
export class MatchPlayerTagEditorComponent implements OnInit {

  public readonly separatorKeysCodes = [ENTER, COMMA];

  @ViewChild('tagsInput') tagsInput!: ElementRef;

  public tagsFormControl = new FormControl();

  ngOnInit(): void {
  }

  filteredTags: Observable<Tag[]>;

  tags: Tag[] = [];

  allTags: Tag[] = [
    { name: 'Plateau' },
    { name: 'Lemon' },
    { name: 'Lime' },
    { name: 'Orange' },
    { name: 'Strawberry' }
  ];

  constructor() {
    this.filteredTags = this.tagsFormControl.valueChanges.pipe(
      startWith(null),
      map((tag: Tag | null) => tag ? this.filter(tag) : this.allTags.slice()));
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    if (value.trim() === '') {
      return
    }

    this.tags.push({name: value});

    if (input) {
      input.value = '';
    }
    this.tagsFormControl.setValue(null);
  }

  remove(tag: any): void {
    const index = this.tags.indexOf(tag);

    if (index >= 0) {
      this.tags.splice(index, 1);
    }
  }

  isTag(pet: Tag | string): pet is Tag {
    return (pet as Tag).name !== undefined;
  }

  filter(tagToFilter:any) {
    if (this.isTag(tagToFilter)) {
      return this.allTags.filter(tag => tag.name.toLowerCase().includes(tagToFilter.name.toLowerCase()));  
    }
    return this.allTags.filter(tag => tag.name.toLowerCase().includes(tagToFilter.toLowerCase()));  
  }

  selected(event: any): void {
    console.log(event)
    this.tags.push({name: event.option.viewValue});
    this.tagsInput.nativeElement.value = '';
    this.tagsFormControl.setValue(null);
  }
}