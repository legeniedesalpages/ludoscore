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
import { Component, OnInit } from '@angular/core';
import { Navigate } from '@ngxs/router-plugin';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { ChoosenTag } from 'src/app/core/model/choosen-tag.model';
import { Player } from 'src/app/core/model/player.model';
import { Tag } from 'src/app/core/model/tag.model';
import { AddTagToMatch, AddTagToPlayer } from 'src/app/core/state/match/match.action';
import { MatchStateModel } from 'src/app/core/state/match/match.model';
import { MatchState } from 'src/app/core/state/match/match.state';

@Component({
  templateUrl: './randomize.component.html',
  styleUrls: ['./randomize.component.css'],
})
export class RandomizeComponent implements OnInit {

  @Select(MatchState) matchState!: Observable<MatchStateModel>;

  constructor(private store: Store) {
  }

  ngOnInit(): void {
  }

  public returnToPlayerSelection() {
    this.store.dispatch(new Navigate(['/player-selection']))
  }

  /** Player */

  public selectPlayerTag(player: Player, name: string, category: string, index: number) {
    //console.log("Evenement d'ajout de tag à un joueur: ", player, category, name)
    this.store.dispatch(new AddTagToPlayer(player.id, name, category, index))
  }

  public alreadySelectedPlayerTag(category: string, player: Player, index: number): string {
    //console.log("Evenement de récupération de tag de joueur: ", category, player, index)
    return player.tags.filter(tag => tag.category == category)[0]?.names[index]
  }

  public playerTagAvailable(playerTag: Tag, player: Player): string[] {
    if (!playerTag.unique) {
      return playerTag.names
    } else {
      const players: Player[] = this.store.selectSnapshot(MatchState).players
      const alreadySelectedName: string[] = players.filter(p => p.id != player.id).flatMap(player => player.tags.filter(tag => tag.category == playerTag.category)[0]?.names)
      return playerTag.names.filter(name => !alreadySelectedName.includes(name))
    }
  }

  public randomizePlayerTag(playerTag: Tag, player: Player, index: number) {
    const availableTagName = this.playerTagAvailable(playerTag, player)
    const tagName: string = availableTagName[Math.floor(Math.random() * availableTagName.length)]
    this.store.dispatch(new AddTagToPlayer(player.id, playerTag.category, tagName, index))
  }

  public randomizeAllPlayerTag() {
    const matchState = this.store.selectSnapshot(MatchState)
    const players: Player[] = matchState.players
    players.forEach(player => {
      const playerTags: Tag[] = matchState.playerTags
      playerTags.forEach(tag => {
        for (let i = 0; i < tag.maxOcurrences; i++) {
          this.randomizePlayerTag(tag, player, i)
        }
      })
    })
  }

  /** Match */

  public selectMatchTag(name: string, category: string, index: number) {
    console.log("Evenement d'ajout de tag de match: ", category, name, index)
    this.store.dispatch(new AddTagToMatch(category, name, index))
  }

  public alreadySelectedMatchTag(matchTag: Tag, index: number): string {
    const matchState = this.store.selectSnapshot(MatchState)
    const choosenMatchTags: ChoosenTag[] = matchState.choosenTags
    return choosenMatchTags.filter(tag => tag.category == matchTag.category)[0]?.names[index]
  }

  public randomizeMatchTag(matchTag: Tag, index: number) {
    const availableTagName = matchTag.names
    const tagName: string = availableTagName[Math.floor(Math.random() * availableTagName.length)]
    this.store.dispatch(new AddTagToMatch(matchTag.category, tagName, index))
  }

  public matchTagAvailable(matchTag: Tag, index: number): string[] {
    if (!matchTag.unique) {
      return matchTag.names
    } else {
      const matchState: MatchStateModel = this.store.selectSnapshot(MatchState)
      const alreadySelectedName: string[] = matchState.choosenTags.filter(tag => tag.category == matchTag.category).flatMap(tag => tag.names)

      const names: string[] = []
      matchTag.names.forEach(function(name, i) {
        if (index == i) {
          names.push(name)
        }
        if (!alreadySelectedName.includes(name)) {
          names.push(name)
        }
      })
      return names
    }
  }
}
