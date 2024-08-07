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
import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core'
import { Select, Store } from '@ngxs/store'
import { Observable, Subject, Subscription } from 'rxjs'
import { ChoosenTag, MatchModel, Team } from 'src/app/core/model/match.model'
import { Tag } from 'src/app/core/model/tag.model'
import { UpdateTeamTags } from 'src/app/core/state/match/match.action'
import { MatchState } from 'src/app/core/state/match/match.state'

@Component({
  selector: 'team-tags-selection',
  templateUrl: './tags-selection.component.html',
  styleUrls: ['./tags-selection.component.css'],
})
export class TeamTagsSelectionComponent implements OnInit, OnDestroy {

  @Select(MatchState.teams) teams!: Observable<Team[]>
  @Select(MatchState.match) match!: Observable<MatchModel>
  private teamSubscription!: Subscription
  private randomizeSubscription! : Subscription

  @Input() teamIndex!: number
  @Input() teamChoosenTags!: ChoosenTag[][];
  @Input() saving!: Subject<boolean>;
  @Input() randomize!: Subject<boolean>;
  

  public tags: Tag[]
  public team!: Team
  public tagSelected: Map<string, [string, string, number]> = new Map()
  public tagRemoved: Map<string, [string, number]> = new Map()
  public choosenTags: ChoosenTag[] = []

  constructor(private store: Store) {
    this.tags = this.store.selectSnapshot<MatchModel>(MatchState.match).game.playerTags
  }

  ngOnInit(): void {

    if (this.teamChoosenTags == undefined) {
      const teams = this.store.selectSnapshot<Team[]>(MatchState.teams)
      this.teamChoosenTags = teams.map(team => team.choosenTags)
    } else {
      console.log(this.teamChoosenTags)
    }

    this.teamSubscription = this.teams.subscribe(teams => {
      this.team = teams[this.teamIndex]
    })

    this.choosenTags = this.team.choosenTags.map(tag => {
      const newTag = {
        ...tag,
        names: tag.names.map(name => name)
      }
      return newTag
    })

    this.saving.subscribe(_ => {
      this.store.dispatch(new UpdateTeamTags(
        this.team,
        Array.from(this.tagSelected.values()),
        Array.from(this.tagRemoved.values())
      ))
    })

    if (this.randomize) {
      this.randomizeSubscription = this.randomize.subscribe(_ => {
        this.randomizeAllTeamTags()
      })
    }
  }

  ngOnDestroy(): void {
    this.teamSubscription.unsubscribe()
    if (this.randomizeSubscription) {
      this.randomizeSubscription.unsubscribe()
    }
  }

  public alreadySelectedTag(category: string, index: number): string {
    return this.choosenTags.find(tag => tag.category == category)?.names[index]!
  }

  public tagAvailable(teamTag: Tag, index: number): string[] {
    if (!teamTag.unique) {
      return teamTag.names
    }

    
    const alreadySelectedName: string[] = this.teamChoosenTags.flatMap(team => team.find(tag => tag.category == teamTag.category)?.names!)
    const names = this.choosenTags.find(tag => tag.category == teamTag.category)?.names
    if (names != undefined) {
      alreadySelectedName.push(...names)
    }

    const availableTagName = teamTag.names.filter(name => !alreadySelectedName.includes(name))

    const nameSelectedForThisTag = this.alreadySelectedTag(teamTag.category, index)
    if (nameSelectedForThisTag != undefined) {
      availableTagName.unshift(nameSelectedForThisTag)
    }

    return availableTagName
  }

  public selectTag(name: string, category: string, index: number) {
    this.tagSelected.set(category + "__" + index, [category, name, index])
    this.tagRemoved.delete(category + "__" + index)

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
    this.teamChoosenTags[this.teamIndex] = [...this.choosenTags]
  }

  public cancelSelection(category: string, index: number) {
    this.tagSelected.delete(category + "__" + index)
    this.tagRemoved.set(category + "__" + index, [category, index])
    this.choosenTags.find(tag => tag.category == category)?.names.splice(index, 1, undefined!)
    this.teamChoosenTags[this.teamIndex] = [...this.choosenTags]
  }

  public randomizeTag(teamTag: Tag, index: number) {
    const names = this.tagAvailable(teamTag, index)
    const name = names[Math.floor(Math.random() * names.length)]
    if (name != undefined) {
      this.selectTag(name, teamTag.category, index)
    }
  }

  public randomizeAllTeamTags() {
    this.tags.forEach(tag => {
      for (let i = 0; i < tag.maxOcurrences; i++) {
        this.randomizeTag(tag, i)
      }
    })
  }
}
