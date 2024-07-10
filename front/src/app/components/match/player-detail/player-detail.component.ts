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
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { Select, Store } from '@ngxs/store';
import { Observable, Subscription } from 'rxjs';
import { ColorTag } from 'src/app/core/model/color-tag.model';
import { Player } from 'src/app/core/model/player.model';
import { Tag } from 'src/app/core/model/tag.model';
import { AddTagToPlayer, ChangePlayerColor } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';

@Component({
  selector: 'player-detail',
  templateUrl: './player-detail.component.html',
  styleUrls: ['./player-detail.component.css']
})
export class PlayerDetailComponent {

  @Select(MatchState) matchState!: Observable<MatchStateModel>

  public colors: ColorTag[] = []

  constructor(public dialogRef: MatDialogRef<PlayerDetailComponent>, @Inject(MAT_DIALOG_DATA) public player: Player, private store: Store) {
    this.colors = this.store.selectSnapshot(MatchState).playerColors
    console.log("color:", this.colors.length)
  }

  close() {
    this.dialogRef.close()
  }

  public colorChange(color: string) {
    let newColor = this.colors.find(c => c.name == color)!
    console.debug("Nouvelle couleur:", newColor)
    this.player = {
      ...this.player,
      color: newColor
    }
  }

  public alreadySelectedPlayerTag(category: string, player: Player, index: number): string {
    return player.choosenTags.filter(tag => tag.category == category)[0]?.names[index]
  }

  public selectPlayerTag(player: Player, name: string, category: string, index: number,element: MatSelect | undefined) {
    this.store.dispatch(new AddTagToPlayer(player.id, category, name, index))
  }

  public playerTagAvailable(playerTag: Tag, pp: Player, index: number): string[] {
    if (!playerTag.unique) {
      return playerTag.names
    }

    const players: Player[] = this.store.selectSnapshot(MatchState).players
    const player = players.find(p => p.id == pp.id)!

    const alreadySelectedName: string[] = players.flatMap(player => player.choosenTags.filter(tag => tag.category == playerTag.category)[0]?.names)
    const availableTagName = playerTag.names.filter(name => !alreadySelectedName.includes(name))

    const nameSelectedForThisTag = this.alreadySelectedPlayerTag(playerTag.category, player, index)
    console.log(nameSelectedForThisTag)
    if (nameSelectedForThisTag != undefined) {
      availableTagName.unshift(nameSelectedForThisTag)
    }
    return availableTagName
  }

  public save() {
    this.store.dispatch(new ChangePlayerColor(this.player.id, this.player.color))
    this.dialogRef.close(this.player)
  }
}
