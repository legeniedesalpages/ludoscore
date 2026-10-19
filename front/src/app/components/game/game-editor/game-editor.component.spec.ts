import { ChangeDetectorRef } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MatSnackBar } from '@angular/material/snack-bar'
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router'
import { Store } from '@ngxs/store'
import { of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { Game } from 'src/app/core/model/game.model'
import { FindGameService } from 'src/app/core/services/game/find-game.service'
import { GameService } from 'src/app/core/services/game/game.service'
import { GameEditorComponent } from './game-editor.component'
import { GameEditorModule } from './game-editor.module'
import { COLORS, Tag, TagValueChange } from 'src/app/core/model/tag.model'
import { By } from '@angular/platform-browser'
import { ScoreTag, ScoreTagChange } from 'src/app/core/model/score.model'
import { ColorTagEditorComponent } from './color-tag-editor/color-tag-editor.component'

describe('GameEditorComponent expansions', () => {
  function setup(type: 'bgg' | 'owned', isExpansion: boolean, render = false) {
    const game: Game = {
      id: 1, bggId: 50, title: 'Extension française', isExpansion,
      imageUrl: 'image.jpg', thumbnailUrl: 'thumb.jpg',
      isOnlyCooperative: false, minPlayers: 1, maxPlayers: 4,
      inLibrary: true, ownershipDate: null, estimatedDurationInMinutes: 30,
      drawAllowed: true, drawBreaker: [], quantifiableScore: true, highestScoreWin: true,
      matchTags: [], playerTags: [], playerColors: [], scoreTags: [],
    }
    const save = vi.fn().mockReturnValue(of(game))
    const open = vi.fn()
    const detail = vi.fn().mockReturnValue(of({
      id: 50, name: game.title, isExpansion, canAddExpansion: true, baseGames: [],
      imageUrlFromBgg: 'image.jpg', thumbnailUrlFromBgg: 'thumb.jpg',
      minplayers: 1, maxplayers: 4,
    }))
    const getFromBgg = vi.fn().mockReturnValue(of(game))
    TestBed.configureTestingModule({ imports: [GameEditorModule], providers: [
      GameEditorComponent,
      { provide: Store, useValue: { dispatch: vi.fn().mockReturnValue(of(undefined)) } },
      { provide: ActivatedRoute, useValue: {
        paramMap: of(convertToParamMap({ id: '50', type })),
        snapshot: { queryParamMap: convertToParamMap({}) },
      } },
      { provide: Router, useValue: {} },
      { provide: MatSnackBar, useValue: { open } },
      { provide: FindGameService, useValue: { detail, resetSearch: vi.fn() } },
      { provide: GameService, useValue: { save, getFromBgg } },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
    ] })
    const fixture = render ? TestBed.createComponent(GameEditorComponent) : undefined
    return { component: fixture?.componentInstance ?? TestBed.inject(GameEditorComponent), fixture, save, open, detail, getFromBgg, game }
  }

  it.each(['bgg', 'owned'] as const)('preserves expansion metadata when saving from %s', type => {
    const { component, save, open } = setup(type, true)
    component.ngOnInit()
    expect(component.isExpansion).toBe(true)
    expect(component.gameEditorForm.get('name')?.value).toBe('Extension française')
    component.saveGame()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      bggId: 50, isExpansion: true, title: 'Extension française', minPlayers: 1, maxPlayers: 4,
    }))
    expect(open).toHaveBeenCalledWith('Extension enregistrée', 'Fermer', expect.anything())
  })

  it('keeps normal game creation unchanged', () => {
    const { component, save } = setup('bgg', false)
    component.ngOnInit()
    component.saveGame()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ isExpansion: false }))
  })

  it('surfaces a BGG failure when loading an expansion', () => {
    const { component, detail, open } = setup('bgg', true)
    detail.mockReturnValue(throwError(() => new Error('BGG unavailable')))
    component.ngOnInit()
    expect(component.loading).toBe(false)
    expect(open).toHaveBeenCalled()
  })

  it('blocks saving an expansion until a base game is registered', () => {
    const { component, save, detail, open } = setup('bgg', true)
    detail.mockReturnValue(of({
      id: 50, name: 'Extension', isExpansion: true, canAddExpansion: false,
      baseGames: [{ id: 42, name: 'Base', registered: false, owned: false }],
      imageUrlFromBgg: 'image.jpg', thumbnailUrlFromBgg: 'thumb.jpg', minplayers: 1, maxplayers: 4,
    }))
    component.ngOnInit()
    component.saveGame()
    expect(component.canAddExpansion).toBe(false)
    expect(save).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledWith("Ajoutez d'abord un jeu de base dans le catalogue.", 'Fermer', expect.anything())
  })

  it.each([-1, 1.5, null, 65536])('rejects invalid additional players %s', value => {
    const { component, save, open } = setup('bgg', true)
    component.ngOnInit()
    component.gameEditorForm.get('additionalPlayers')!.setValue(value)
    component.saveGame()
    expect(save).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalled()
  })

  it.each([0, 2])('saves %s additional players and separates inherited colors', value => {
    const { component, getFromBgg, game, save } = setup('owned', true)
    getFromBgg.mockReturnValue(of({
      ...game, additionalPlayers: value, playerColors: [COLORS[0], COLORS[2]],
      baseGameColors: [
        { bggId: 42, title: 'Base A', playerColors: [COLORS[0]] },
        { bggId: 60, title: 'Base B', playerColors: [COLORS[1]] },
      ],
    }))
    component.ngOnInit()
    expect(component.inheritedColors).toEqual([COLORS[0], COLORS[1]])
    expect(component.tagsColor).toEqual([COLORS[2]])
    component.saveGame()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ additionalPlayers: value, playerColors: [COLORS[2]] }))
  })

  it.each(['bgg', 'owned'] as const)('renders only expansion settings from %s', async type => {
    const { fixture, detail, getFromBgg, game } = setup(type, true, true)
    const baseGameColors = [{ bggId: 42, title: 'Base A', playerColors: [COLORS[0]] }]
    detail.mockReturnValue(of({
      id: 50, name: 'Extension', isExpansion: true, canAddExpansion: true, baseGames: [],
      imageUrlFromBgg: 'image.jpg', thumbnailUrlFromBgg: 'thumb.jpg',
      minplayers: 1, maxplayers: 4, baseGameColors,
    }))
    getFromBgg.mockReturnValue(of({ ...game, baseGameColors }))
    await fixture!.whenStable()
    for (const name of ['estimatedDurationInMinutes', 'minPlayer', 'maxPlayer', 'cooperative', 'quantifiableScore', 'highestScoreWin']) {
      expect(fixture!.nativeElement.querySelector(`[formControlName="${name}"]`)).toBeNull()
      expect(fixture!.componentInstance.gameEditorForm.get(name)!.disabled).toBe(true)
    }
    expect(fixture!.nativeElement.querySelector('[formControlName="additionalPlayers"]')).not.toBeNull()
    expect(fixture!.nativeElement.textContent).toContain('Couleurs du jeu de base')
    expect(fixture!.nativeElement.textContent).not.toContain('non modifiables')
    const editors = fixture!.debugElement.queryAll(By.directive(ColorTagEditorComponent))
    expect(editors[0].componentInstance.readonly).toBe(true)
    expect(editors[0].nativeElement.querySelector('[matChipRemove]')).toBeNull()
    expect(editors[0].nativeElement.querySelector('.color-add')).toBeNull()
    expect(editors[1].componentInstance.excludedTags).toEqual([COLORS[0]])
    expect(fixture!.nativeElement.querySelector('score-tag-editor')).not.toBeNull()
  })

  it('keeps base-game settings visible and hides additional players for a normal game', async () => {
    const { fixture } = setup('owned', false, true)
    await fixture!.whenStable()
    for (const name of ['estimatedDurationInMinutes', 'minPlayer', 'maxPlayer', 'cooperative', 'quantifiableScore', 'highestScoreWin']) {
      expect(fixture!.nativeElement.querySelector(`[formControlName="${name}"]`)).not.toBeNull()
    }
    expect(fixture!.nativeElement.querySelector('[formControlName="additionalPlayers"]')).toBeNull()
  })

  it.each(['bgg', 'owned'] as const)('renders inherited tag groups from %s and saves only their changes', async type => {
    const { fixture, component, detail, getFromBgg, game, save } = setup(type, true, true)
    const tag: Tag = { category: 'Faction', names: ['A', 'B'], unique: true, minOcurrences: 1, maxOcurrences: 1 }
    const baseGameTags = [
      { bggId: 42, title: 'Base A', playerTags: [tag], matchTags: [tag] },
      { bggId: 60, title: 'Base B', playerTags: [tag], matchTags: [] },
    ]
    const expansionTagChanges: TagValueChange[] = [{ baseGameBggId: 42, scope: 'player', category: 'Faction', addedValues: ['C'], removedValues: ['A'] }]
    getFromBgg.mockReturnValue(of({ ...game, baseGameTags, expansionTagChanges }))
    detail.mockReturnValue(of({
      id: 50, name: 'Extension', isExpansion: true, canAddExpansion: true, baseGames: [],
      minplayers: 1, maxplayers: 4, imageUrlFromBgg: 'image.jpg', baseGameTags,
    }))
    await fixture!.whenStable()
    expect(fixture!.nativeElement.textContent).toContain('Tags joueurs hérités de Base A')
    expect(fixture!.nativeElement.textContent).toContain('Tags joueurs hérités de Base B')
    expect(fixture!.nativeElement.textContent).toContain('Tags du jeu hérités de Base A')
    expect(fixture!.nativeElement.textContent).not.toContain('valeurs uniquement')
    expect(fixture!.nativeElement.textContent).toContain('Tags spécifiques à l\'extension')
    expect(fixture!.nativeElement.textContent).toContain('Tags des joueurs de l\'extension')
    component.saveGame()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      playerTags: [], matchTags: [], expansionTagChanges: type === 'owned' ? expansionTagChanges : [],
    }))
    expect(tag.names).toEqual(['A', 'B'])
  })

  it('keeps obsolete tag changes visible and removable instead of silently dropping them', () => {
    const { component, getFromBgg, game } = setup('owned', true)
    const change: TagValueChange = { baseGameBggId: 42, scope: 'match', category: 'Missing', addedValues: ['C'], removedValues: [] }
    getFromBgg.mockReturnValue(of({ ...game, expansionTagChanges: [change] }))
    component.ngOnInit()
    expect(component.unavailableTagChanges()).toEqual([change])
    component.resetTagChange(change)
    expect(component.expansionTagChanges).toEqual([])
  })

  it.each(['bgg', 'owned'] as const)('renders inherited score categories from %s and saves only their changes', async type => {
    const { fixture, component, detail, getFromBgg, game, save } = setup(type, true, true)
    const scoreTag: ScoreTag = { category: 'Animaux', negatif: false, complex: false, color: COLORS[0] }
    const baseGameTags = [{ bggId: 42, title: 'Base A', playerTags: [], matchTags: [], scoreTags: [scoreTag] }]
    const expansionScoreChanges: ScoreTagChange[] = [{ baseGameBggId: 42, category: 'Animaux', properties: { negatif: true } }]
    getFromBgg.mockReturnValue(of({ ...game, baseGameTags, expansionScoreChanges }))
    detail.mockReturnValue(of({
      id: 50, name: 'Extension', isExpansion: true, canAddExpansion: true, baseGames: [],
      minplayers: 1, maxplayers: 4, imageUrlFromBgg: 'image.jpg', baseGameTags,
    }))
    await fixture!.whenStable()
    const text = fixture!.nativeElement.textContent
    expect(text).toContain('Catégories de score héritées du jeu de base')
    expect(text).toContain('Catégories de score spécifiques à l\'extension')
    expect(text).toContain(type === 'owned' ? 'Animaux (modifié)' : 'Animaux')
    component.saveGame()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      scoreTags: [], expansionScoreChanges: type === 'owned' ? expansionScoreChanges : [],
    }))
    expect(scoreTag.negatif).toBe(false)
  })

  it('keeps obsolete score changes visible and removable', () => {
    const { component, getFromBgg, game } = setup('owned', true)
    const change: ScoreTagChange = { baseGameBggId: 42, category: 'Missing', properties: { complex: true } }
    getFromBgg.mockReturnValue(of({ ...game, expansionScoreChanges: [change] }))
    component.ngOnInit()
    expect(component.unavailableScoreChanges()).toEqual([change])
    component.resetScoreChange(change)
    expect(component.expansionScoreChanges).toEqual([])
  })
})
