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

  public selectMatchTag(name: string, category: string) {
    console.log("Evenement d'ajout de tag de match: ", category, name)
    this.store.dispatch(new AddTagToMatch({ name: name, category: category }))
  }

  public selectPlayerTag(player: Player, name: string, category: string) {
    console.log("Evenement d'ajout de tag à un joueur: ", player, category, name)
    this.store.dispatch(new AddTagToPlayer(player.id, { name: name, category: category }))
  }

  public alreadySelectedTag(category: string, player: Player): string {
    return player.tags.filter(tag => tag.category == category)[0]?.name
  }

  public playerTagAvailable(playerTag: Tag, player: Player): string[] {
    if (!playerTag.unique) {
      return playerTag.names
    } else {
      const players: Player[] = this.store.selectSnapshot(MatchState).players
      const alreadySelectedName: string[] = players.filter(p => p.id != player.id).map(player => player.tags.filter(tag => tag.category == playerTag.category)[0]?.name)
      return playerTag.names.filter(name => !alreadySelectedName.includes(name))
    }
  }

  public randomizePlayerTag(playerTag: Tag, player: Player) {
    const availableTagName = this.playerTagAvailable(playerTag, player)
    const tagName: string = availableTagName[Math.floor(Math.random() * availableTagName.length)]
    this.store.dispatch(new AddTagToPlayer(player.id, { name: tagName, category: playerTag.category }))
  }

  public randomizeAllPlayerTag() {
    const matchState = this.store.selectSnapshot(MatchState)
    const players: Player[] = matchState.players
    players.forEach(player => {
      const playerTags: Tag[] = matchState.playerTags
      playerTags.forEach(tag => {
        this.randomizePlayerTag(tag, player)
      })
    })
  }
}
