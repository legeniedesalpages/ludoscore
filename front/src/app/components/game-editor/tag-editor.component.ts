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
import { Component, OnInit, Input } from '@angular/core';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Tag } from 'src/app/core/model/tag.model';


@Component({
    selector: 'tag-editor',
    templateUrl: './tag-editor.component.html',
    styleUrls: ['./tag-editor.component.css']
})
export class TagEditorComponent implements OnInit {

    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    @Input()
    public tags: Tag[] = [];

    @Input()
    public title: string = '';

    ngOnInit(): void {
    }

    public addTag(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();
        if (value) {
            this.tags.push({ name: value });
        }
        event.chipInput!.clear();
    }

    public removeTag(tag: Tag): void {
        const index = this.tags.indexOf(tag);
        if (index >= 0) {
            this.tags.splice(index, 1);
        }
    }

    public editTag(tag: Tag, event: MatChipEditedEvent) {
        const value = event.value.trim();
        if (!value) {
            this.removeTag(tag);
            return;
        }
        const index = this.tags.indexOf(tag);
        if (index > 0) {
            this.tags[index].name = value;
        }
    }
}