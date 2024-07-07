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
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngxs/store';
import { ColorTag } from 'src/app/core/model/color-tag.model';
import { Player } from 'src/app/core/model/player.model';
import { MatchState } from 'src/app/core/state/match/match.state';

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  styleUrls: ['./player-detail.component.css']
})
export class PlayerDetailComponent implements OnInit {

  public colors: ColorTag[] = []

  constructor(public dialogRef: MatDialogRef<PlayerDetailComponent>, @Inject(MAT_DIALOG_DATA) public player: Player, private store: Store) {
    this.colors = this.store.selectSnapshot(MatchState).playerColors
  }

  close() {
    this.dialogRef.close()
  }

  ngOnInit(): void {
  }

  public colorChange(color: string) {
    let newColor = this.colors.find(c => c.name == color)!
    console.debug("Nouvelle couleur:", newColor)
    this.player = {
      ...this.player,
      color: newColor
    }
  }
}
