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
    //[{"names": ["Credicor", "Tharsis republic", "Teractor", "Ecoline", "PhobLog", "Helion", "Thorgate", "Inventrix"], "unique": true, "category": "Corporation", "maxOcurrences": 4, "minOcurrences": 1}]
    //[{"names": ["Standard", "Hellas", "Elysium"], "unique": true, "category": "Plateau", "maxOcurrences": 1, "minOcurrences": 1}, {"names": ["Lune", "Io", "Encelade", "Titan", "Ceres", "Pluton", "Europe"], "unique": true, "category": "Colonies", "maxOcurrences": 5, "minOcurrences": 2}]
  }

  public returnToPlayerSelection() {
    this.store.dispatch(new Navigate(['/player-selection']))
  }

  /** Player */

  public selectPlayerTag(player: Player, name: string, category: string, index: number) {
    this.store.dispatch(new AddTagToPlayer(player.id, category, name, index))
  }

  public alreadySelectedPlayerTag(category: string, player: Player, index: number): string {
    return player.choosenTags.filter(tag => tag.category == category)[0]?.names[index]
  }

  public playerTagAvailable(playerTag: Tag, player: Player, index: number): string[] {
    if (!playerTag.unique) {
      return playerTag.names
    }

    const players: Player[] = this.store.selectSnapshot(MatchState).players
    const alreadySelectedName: string[] = players.flatMap(player => player.choosenTags.filter(tag => tag.category == playerTag.category)[0]?.names)
    const availableTagName = playerTag.names.filter(name => !alreadySelectedName.includes(name))

    const nameSelectedForThisTag = this.alreadySelectedPlayerTag(playerTag.category, player, index)
    if (nameSelectedForThisTag != undefined) {
      availableTagName.unshift(nameSelectedForThisTag)
    }
    return availableTagName
  }

  public randomizePlayerTag(playerTag: Tag, player: Player, index: number) {
    const availableTagName = this.playerTagAvailable(playerTag, player, index)
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
    this.store.dispatch(new AddTagToMatch(category, name, index))
  }

  public alreadySelectedMatchTag(matchTag: Tag, index: number): string {
    const matchState = this.store.selectSnapshot(MatchState)
    const choosenMatchTags: ChoosenTag[] = matchState.choosenTags
    return choosenMatchTags.filter(tag => tag.category == matchTag.category)[0]?.names[index]
  }  

  public matchTagAvailable(matchTag: Tag, index: number): string[] {
    if (!matchTag.unique) {
      return matchTag.names
    }

    const matchState: MatchStateModel = this.store.selectSnapshot(MatchState)
    const alreadySelectedNameByAll: string[] = matchState.choosenTags.filter(tag => tag.category == matchTag.category).flatMap(tag => tag.names)
    const availableTagName = matchTag.names.filter(name => !alreadySelectedNameByAll.includes(name))

    const nameSelectedForThisTag = this.alreadySelectedMatchTag(matchTag, index)
    if (nameSelectedForThisTag != undefined) {
      availableTagName.unshift(nameSelectedForThisTag)
    }
    return availableTagName
  }

  public randomizeMatchTag(matchTag: Tag, index: number) {
    const availableTagName = this.matchTagAvailable(matchTag, index)
    const tagName: string = availableTagName[Math.floor(Math.random() * availableTagName.length)]
    this.store.dispatch(new AddTagToMatch(matchTag.category, tagName, index))
  }

  public randomizeAllMatchTag() {
    const matchTags: Tag[] = this.store.selectSnapshot(MatchState).matchTags
    matchTags.forEach(tag => {
      for (let i = 0; i < tag.maxOcurrences; i++) {
        this.randomizeMatchTag(tag, i)
      }
    })
  }
}
