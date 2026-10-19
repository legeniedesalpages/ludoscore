import { CommonModule } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { Observable, of, Subject, throwError } from 'rxjs'
import { PlayerEntity } from 'src/app/core/entity/player-entity.model'
import { describe, expect, it, vi } from 'vitest'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { LayoutComponent } from '../../layout/layout.component'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { ManagePlayerComponent } from './manage-player.component'

describe('ManagePlayerComponent creator attribution', () => {
  async function setup(isAdmin: boolean, linkedAccount: boolean, hasCreatorPlayer: boolean, personalized = false, ownCreator = false, association?: 'camel' | 'snake', creatorName?: string) {
    const player = {
      id: 1, pseudo: 'Guest', firstName: '', lastName: '', gravatar: '',
      creatorPseudo: personalized ? 'Canonical name' : null,
      creatorName,
      preferedColor: '', createdAt: undefined,
      user: linkedAccount ? { id: 3, email: 'linked@example.test' } : null,
      createdByUserId: ownCreator ? 2 : 5,
      permissions: association === 'camel' ? { canPersonalize: true } : association === 'snake' ? { can_personalize: true } : {},
      creator: {
        id: ownCreator ? 2 : 5, email: 'creator@example.test',
        player: hasCreatorPlayer ? { id: 4, pseudo: 'Creator pseudo' } : null,
      },
    }
    TestBed.configureTestingModule({
      declarations: [ManagePlayerComponent],
      imports: [CommonModule, MatButtonModule, MatCheckboxModule, LayoutComponent, LoadingSpinnerModule],
      providers: [
        provideRouter([]),
        { provide: Store, useValue: { selectSnapshot: () => 2, dispatch: vi.fn() } },
        { provide: PlayerCrudService, useValue: { findAll: () => of([player]) } },
        { provide: UserCrudService, useValue: { findOne: () => of({ isAdmin }) } },
      ],
    })
    const fixture = TestBed.createComponent(ManagePlayerComponent)
    await fixture.whenStable()
    return fixture.nativeElement as HTMLElement
  }

  it('shows the creator account and their player to administrators', async () => {
    const element = await setup(true, false, true)
    expect(element.querySelector('.creator')?.textContent?.replace(/\s+/g, ' ').trim())
      .toBe('Créé par : Creator pseudo (creator@example.test)')
    expect(element.textContent).not.toContain('Joueur du créateur')
  })

  it('shows the creator account without inventing a player when none is linked', async () => {
    const element = await setup(true, false, false)
    expect(element.querySelector('.creator')?.textContent).toContain('creator@example.test')
    expect(element.querySelector('.creator-player')).toBeNull()
  })

  it('keeps the associated account instead of creator attribution for linked players', async () => {
    const element = await setup(true, true, true)
    expect(element.querySelector('.compte')?.textContent).toContain('linked@example.test')
    expect(element.querySelector('.creator')).toBeNull()
  })

  it('never renders creator details for non-administrators', async () => {
    const element = await setup(false, false, true)
    expect(element.textContent).not.toContain('creator@example.test')
    expect(element.textContent).not.toContain('Creator pseudo')
    expect(element.querySelector('.creator')).toBeNull()
  })

  it.each([true, false])('shows only "Créé par vous" for the current creator (admin=%s)', async isAdmin => {
    const element = await setup(isAdmin, false, true, false, true)
    expect(element.querySelector('.creator')?.textContent?.trim()).toBe('Créé par vous')
    expect(element.textContent).not.toContain('creator@example.test')
    expect(element.textContent).not.toContain('Creator pseudo')
    expect(element.querySelector('.player-association')).toBeNull()
  })

  it.each(['camel', 'snake'] as const)('marks an associated player even without a personal nickname (%s permissions)', async association => {
    const element = await setup(false, false, true, false, false, association)
    expect(element.querySelector('.player-association')?.textContent).toContain('copié depuis un autre compte')
    expect(element.textContent).not.toContain('creator@example.test')
    expect(element.querySelector('small.player-creator-pseudo')).toBeNull()
  })

  it('identifies the creator of a copied player by nickname without exposing their email', async () => {
    const element = await setup(false, false, true, false, false, 'snake', 'Reno')
    expect(element.querySelector('.player-association')?.textContent?.trim()).toBe('Copié depuis le compte de Reno')
    expect(element.textContent).not.toContain('creator@example.test')
  })

  it('shows the personal nickname with the canonical name in smaller supporting text', async () => {
    const element = await setup(false, false, false, true)
    expect(element.querySelector('.heading')?.textContent).toContain('Guest')
    expect(element.querySelector('small.player-creator-pseudo')?.textContent).toBe('(Canonical name)')
  })
})

describe('ManagePlayerComponent replaced player filter', () => {
  async function setup(isAdmin = true) {
    const active = { id: 1, pseudo: 'Active', gravatar: '', preferedColor: '', createdAt: undefined } satisfies PlayerEntity
    const replaced = { ...active, id: 2, pseudo: 'Archive', status: 'replaced' as const, replacedByPlayerId: 1 }
    const findAll = vi.fn((includeReplaced = false): Observable<PlayerEntity[]> => of(includeReplaced ? [active, replaced] : [active]))
    TestBed.configureTestingModule({
      declarations: [ManagePlayerComponent],
      imports: [CommonModule, MatButtonModule, MatCheckboxModule, LayoutComponent, LoadingSpinnerModule],
      providers: [
        provideRouter([]),
        { provide: Store, useValue: { selectSnapshot: () => 2, dispatch: vi.fn() } },
        { provide: PlayerCrudService, useValue: { findAll } },
        { provide: UserCrudService, useValue: { findOne: () => of({ isAdmin }) } },
      ],
    })

    const fixture = TestBed.createComponent(ManagePlayerComponent)
    await fixture.whenStable()
    return { fixture, element: fixture.nativeElement as HTMLElement, findAll, active }
  }

  it('hides archives by default and lets an administrator disable then restore the filter', async () => {
    const { fixture, element, findAll } = await setup()
    const checkbox = element.querySelector<HTMLInputElement>('mat-checkbox input')!
    expect(checkbox.checked).toBe(true)
    expect(findAll).toHaveBeenCalledWith()
    expect(element.textContent).not.toContain('Archive')
    checkbox.click()
    await fixture.whenStable()
    expect(findAll).toHaveBeenLastCalledWith(true)
    expect(element.textContent).toContain('Archive')
    expect(element.textContent).toContain('Remplacé par le joueur n° 1')
    checkbox.click()
    await fixture.whenStable()
    expect(findAll).toHaveBeenLastCalledWith(false)
    expect(element.textContent).not.toContain('Archive')
  })

  it('does not expose the filter or allow non-administrators to request archives', async () => {
    const { fixture, element, findAll } = await setup(false)
    expect(element.querySelector('mat-checkbox')).toBeNull()
    fixture.componentInstance.setHideReplaced(false)
    expect(findAll).toHaveBeenCalledTimes(1)
    expect(fixture.componentInstance.hideReplaced).toBe(true)
  })

  it('clears old results during a reload and disables the filter until it finishes', async () => {
    const { fixture, element, findAll, active } = await setup()
    const pending = new Subject<PlayerEntity[]>()
    findAll.mockReturnValueOnce(pending)
    element.querySelector<HTMLInputElement>('mat-checkbox input')!.click()
    await fixture.whenStable()
    expect(fixture.componentInstance.playerEntities).toEqual([])
    expect(element.querySelector<HTMLInputElement>('mat-checkbox input')?.disabled).toBe(true)
    fixture.componentInstance.setHideReplaced(true)
    expect(findAll).toHaveBeenCalledTimes(2)
    pending.next([active])
    pending.complete()
    await fixture.whenStable()
    expect(fixture.componentInstance.loading).toBe(false)
  })

  it('reports a failed reload and retries with the selected filter', async () => {
    const { fixture, element, findAll } = await setup()
    findAll.mockReturnValueOnce(throwError(() => new Error('Network failure')))
    fixture.componentInstance.setHideReplaced(false)
    await fixture.whenStable()
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Impossible de charger')
    expect(fixture.componentInstance.playerEntities).toEqual([])
    fixture.componentInstance.reloadPlayers()
    await fixture.whenStable()
    expect(findAll).toHaveBeenLastCalledWith(true)
    expect(element.textContent).toContain('Archive')
    expect(element.querySelector('[role="alert"]')).toBeNull()
  })
})

describe('ManagePlayerComponent personal player priority', () => {
  async function setup(playerId: number | null, ids = [1, 3, 2]) {
    const players: PlayerEntity[] = ids.map(id => ({
      id, pseudo: `Player ${id}`, gravatar: '', preferedColor: '', createdAt: new Date('2020-01-02T12:00:00Z'),
      createdByUserId: 2,
    }))
    TestBed.configureTestingModule({
      declarations: [ManagePlayerComponent],
      imports: [CommonModule, MatButtonModule, MatCheckboxModule, LayoutComponent, LoadingSpinnerModule],
      providers: [
        provideRouter([]),
        { provide: Store, useValue: { selectSnapshot: () => 2, dispatch: vi.fn() } },
        { provide: PlayerCrudService, useValue: { findAll: () => of(players) } },
        { provide: UserCrudService, useValue: { findOne: () => of({ isAdmin: true, playerId }) } },
      ],
    })
    const fixture = TestBed.createComponent(ManagePlayerComponent)
    await fixture.whenStable()
    return { fixture, element: fixture.nativeElement as HTMLElement, players }
  }

  it('shows the personal identity in its own card without duplicating it in the list', async () => {
    const { fixture, element, players } = await setup(3)
    expect(fixture.componentInstance.playerEntities.map(player => player.id)).toEqual([1, 2])
    expect(fixture.componentInstance.personalPlayer?.id).toBe(3)
    expect(players.map(player => player.id)).toEqual([1, 3, 2])
    const cards = element.querySelectorAll('.result-list')
    expect(cards).toHaveLength(2)
    expect(Array.from(cards).some(card => card.textContent?.includes('Player 3'))).toBe(false)
    const personal = element.querySelector<HTMLButtonElement>('.personal-player-card')!
    expect(personal.textContent).toContain('Player 3')
    expect(personal.querySelector('.personal-player-caption')?.textContent?.trim())
      .toBe('C’est vous, vous êtes ici depuis le 02/01/2020')
    const edit = vi.spyOn(fixture.componentInstance, 'editPlayer')
    personal.click()
    expect(edit).toHaveBeenCalledWith(3)
    expect(element.querySelector('hr')).toBeNull()
  })

  it('keeps the personal player first after reloading through the archive filter', async () => {
    const { fixture, element } = await setup(3)
    element.querySelector<HTMLInputElement>('mat-checkbox input')!.click()
    await fixture.whenStable()
    expect(fixture.componentInstance.playerEntities.map(player => player.id)).toEqual([1, 2])
    expect(element.querySelector('.personal-player-name')?.textContent).toBe('Player 3')
    expect(element.querySelectorAll('.personal-player-card')).toHaveLength(1)
  })

  it.each([null, 99])('keeps the original order without a visible personal player (%s)', async playerId => {
    const { fixture, element } = await setup(playerId)
    expect(fixture.componentInstance.playerEntities.map(player => player.id)).toEqual([1, 3, 2])
    expect(element.querySelector('.personal-player-card')).toBeNull()
    expect(element.querySelector('hr')).toBeNull()
  })

  it('shows only the dedicated card when the personal player is alone', async () => {
    const { element } = await setup(3, [3])
    expect(element.querySelector('.personal-player-card')?.textContent).toContain('C’est vous')
    expect(element.querySelector('.result-list')).toBeNull()
    expect(element.querySelector('hr')).toBeNull()
  })
})
