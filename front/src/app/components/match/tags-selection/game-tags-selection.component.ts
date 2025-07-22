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
import { Component, Input, OnDestroy, OnInit } from '@angular/core'
import { Select, Store } from '@ngxs/store'
import { Observable, Subject, Subscription } from 'rxjs'
import { ChoosenTag, MatchModel } from 'src/app/core/model/match.model'
import { Tag } from 'src/app/core/model/tag.model'
import { AddGameTags, RemoveGameTags } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  selector: 'game-tags-selection',
  templateUrl: './tags-selection.component.html',
  styleUrls: ['./tags-selection.component.css'],
  standalone: false
})
export class GameTagsSelectionComponent implements OnInit, OnDestroy {

  @Select(MatchState.match) match!: Observable<MatchModel>
  private randomizeSubscription! : Subscription

  @Input() saving!: Subject<boolean>;
  @Input() randomize!: Subject<boolean>;

  public tags: Tag[]
  public choosenTags: ChoosenTag[] = []
  public actions: (AddGameTags | RemoveGameTags)[] = []

  constructor(private store: Store) {
    this.tags = this.store.selectSnapshot<MatchModel>(MatchState.match).game.matchTags
  }

  ngOnInit(): void {
    this.choosenTags = this.store.selectSnapshot<MatchModel>(MatchState.match).choosenTags.map(tag => {
      const newTag = {
        ...tag,
        names: tag.names.map(name => name)
      }
      return newTag
    })

    this.saving.subscribe(_ => {
       this.store.dispatch(this.actions) 
    })

    if (this.randomize) {
      this.randomizeSubscription = this.randomize.subscribe(_ => {
        this.randomizeAllTags()
      })
    }
  }

  ngOnDestroy(): void {
    if (this.randomizeSubscription) {
      this.randomizeSubscription.unsubscribe()
    }
  }


  public alreadySelectedTag(category: string, index: number): string {
    return this.choosenTags.find(tag => tag.category == category)?.names[index]!
  }

  public tagAvailable(tag: Tag, index: number): string[] {
    if (!tag.unique) {
      return tag.names
    }

    const allNamesForThisCategory = this.tags.find(gameTag => gameTag.category == tag.category)?.names!
    const allNamesSelected = this.choosenTags.find(gameTag => gameTag.category == tag.category)?.names
    if (allNamesSelected == undefined) {
      return allNamesForThisCategory!
    }

    const filteredName = allNamesForThisCategory.filter(name => !allNamesSelected.includes(name))
    if (allNamesSelected[index]! != undefined) {
      filteredName.unshift(allNamesSelected[index]!)
    }

    return filteredName!
  }

  public selectTag(name: any, category: string, index: number) {
    const chosenTagForCategory = this.choosenTags.find(tag => tag.category == category)
    if (chosenTagForCategory != undefined) {
      chosenTagForCategory.names[index] = name
    } else {
      const names: string[] = []
      names[index] = name
      this.choosenTags.push({
        category: category,
        names: names
      })
    }
    this.actions.push(new AddGameTags(category, name, index))
  }

  public cancelSelection(category: string, index: number) {
    this.choosenTags.find(tag => tag.category == category)?.names.splice(index, 1, undefined!)
    this.actions.push(new RemoveGameTags(category, index))
  }

  public randomizeTag(teamTag: Tag, index: number) {
    const names = this.tagAvailable(teamTag, index)
    const name = names[Math.floor(Math.random() * names.length)]
    if (name != undefined) {
      this.selectTag(name, teamTag.category, index)
    }
  }

  public randomizeAllTags() {
    this.tags.forEach(tag => {
      for (let i = 0; i < tag.maxOcurrences; i++) {
        this.randomizeTag(tag, i)
      }
    })
  }
}