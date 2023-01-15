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
import { Component, OnInit } from '@angular/core';
import { Tag } from 'src/app/core/model/tag.model';

@Component({
  selector: 'match-player-editor',
  templateUrl: './match-player-editor.component.html',
  styleUrls: ['./match-player-editor.component.css']
})
export class MatchPlayerEditorComponent implements OnInit {

  public tags: Tag[] = []

  ngOnInit(): void {
  }

  public createPlayer() {
    console.info("Create player")
  }
}