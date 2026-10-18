import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { SelectingGame } from 'src/app/core/model/game.model'
import { GameService } from 'src/app/core/services/game/game.service'
import { GameLibraryComponent } from './game-library.component'

describe('GameLibraryComponent filters', () => {
  function game(id: number, title: string, inLibrary: boolean, personalPlayedMatchCount: number): SelectingGame {
    return {
      id, title, inLibrary, personalPlayedMatchCount,
      playedMatchCount: 10, libraryUserCount: 3, bggId: id, imageUrl: '', thumbnailUrl: '',
      isOnlyCooperative: false, minPlayers: 1, maxPlayers: 4,
      ownershipDate: new Date('2020-01-01'), matchTags: [], playerTags: [],
      playerColors: [], scoreTags: [], drawAllowed: true, drawBreaker: [],
      quantifiableScore: true, highestScoreWin: true, estimatedDurationInMinutes: 30,
      lastPlayed: new Date('2026-01-01'), lastWinner: '', createdAt: '2020-01-01',
    }
  }

  async function setup() {
    const games = [
      game(1, 'Zebra', true, 0),
      game(2, 'Alpha', true, 2),
      game(3, 'Emprunte', false, 1),
      game(4, 'Inconnu', false, 0),
    ]
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      { provide: Store, useValue: { dispatch: vi.fn() } },
      { provide: GameService, useValue: { listAllGames: () => of(games) } },
    ] })
    const fixture = TestBed.createComponent(GameLibraryComponent)
    await fixture.whenStable()
    return fixture
  }

  it('defaults to the library, including both played and unplayed owned games in title order', async () => {
    const fixture = await setup()
    expect(fixture.componentInstance.filter()).toBe('in')
    expect(fixture.componentInstance.filteredGames().map(game => game.id)).toEqual([2, 1])
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select')
    expect(select.value).toBe('in')
    expect(select.selectedOptions[0].textContent).toContain('Dans la ludothèque')
    expect(select.options).toHaveLength(3)
    expect(select.labels?.[0].textContent).toContain('Afficher les jeux')
  })

  it('separates personally played and never played outside-library games through the dropdown', async () => {
    const fixture = await setup()
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select')
    select.value = 'played'
    select.dispatchEvent(new Event('change'))
    await fixture.whenStable()
    expect(fixture.componentInstance.filteredGames().map(game => game.id)).toEqual([3])
    const playedText = fixture.nativeElement.querySelector('.result-list').textContent
    expect(playedText).toContain('Dans la ludothèque de 3 utilisateurs')
    expect(playedText).toContain('1 partie jouée par vous')
    expect(playedText).not.toContain('10 parties')
    expect(fixture.nativeElement.querySelector('.result-list .play-count').textContent).toContain('1 partie jouée par vous')
    select.value = 'unplayed'
    select.dispatchEvent(new Event('change'))
    await fixture.whenStable()
    expect(fixture.componentInstance.filteredGames().map(game => game.id)).toEqual([4])
    const unplayedText = fixture.nativeElement.querySelector('.result-list').textContent
    expect(unplayedText).toContain('Dans la ludothèque de 3 utilisateurs')
    expect(unplayedText).toContain('10 parties jouées au total, tous utilisateurs')
    expect(unplayedText).not.toContain('par vous')
    expect(fixture.nativeElement.querySelector('.result-list .play-count').textContent).toContain('10 parties jouées au total, tous utilisateurs')
  })

  it('shows acquisition dates and personal play counts for owned games instead of the library label', async () => {
    const fixture = await setup()
    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.result-list')
    expect(rows[0].textContent).toContain('Obtenu le 01/01/2020')
    expect(rows[0].textContent).toContain('2 parties jouées par vous')
    expect(rows[1].textContent).toContain('Aucune partie jouée par vous')
    expect(rows[0].textContent).not.toContain('Dans la ludothèque')
    expect(rows[0].textContent).not.toContain('10 parties')
    expect(rows[0].querySelector('.play-count')?.textContent).toContain('2 parties jouées par vous')
  })

  it('handles missing acquisition dates and zero or singular owner and match counts', async () => {
    const fixture = await setup()
    const owned = fixture.componentInstance.games()[0]
    fixture.componentInstance.games.set([{ ...owned, ownershipDate: null }])
    await fixture.whenStable()
    const ownedText = fixture.nativeElement.querySelector('.result-list').textContent
    expect(ownedText).not.toContain("obtention")
    expect(ownedText).not.toContain('Obtenu le')
    expect(ownedText).not.toContain('0 partie')
    expect(ownedText).toContain('Aucune partie jouée par vous')

    fixture.componentInstance.filter.set('unplayed')
    for (const count of [0, 1]) {
      fixture.componentInstance.games.set([{
        ...owned, inLibrary: false, libraryUserCount: count, playedMatchCount: count,
      }])
      await fixture.whenStable()
      const text = fixture.nativeElement.querySelector('.result-list').textContent
      expect(text).toContain(`Dans la ludothèque de ${count} utilisateur`)
      expect(text).toContain(count === 0
        ? 'Aucune partie jouée au total, tous utilisateurs'
        : '1 partie jouée au total, tous utilisateurs')
      expect(text).not.toContain('0 partie')
    }
  })

  it('combines search with the selected category and displays the empty state', async () => {
    const fixture = await setup()
    fixture.componentInstance.filter.set('played')
    fixture.componentInstance.searchText.set('  EMPR  ')
    await fixture.whenStable()
    expect(fixture.componentInstance.filteredGames().map(game => game.id)).toEqual([3])
    fixture.componentInstance.searchText.set('Inconnu')
    await fixture.whenStable()
    expect(fixture.componentInstance.filteredGames()).toEqual([])
    expect(fixture.nativeElement.querySelector('.empty').textContent).toContain('Aucun jeu ne correspond')
  })
})
