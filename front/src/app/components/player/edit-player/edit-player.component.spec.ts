import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { PlayerAssociation } from 'src/app/core/entity/player-entity.model'
import { of, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { PlayerService } from 'src/app/core/services/player/player.service'
import { EditPlayerComponent } from './edit-player.component'
import { EditPlayerModule } from './edit-player.module'

describe('EditPlayerComponent participation count', () => {
  async function setup(count: number, id = 1, admin = true, personalInfo = true, denied = false) {
    const associations: PlayerAssociation[] = [{
      userId: 3, email: 'shared@example.test', isCreator: false,
      canViewPersonalInfo: false, canViewOtherMatches: false, canAddToMatch: false,
      associatedAt: '2026-10-18T12:00:00',
    }]
    const saveAssociation = vi.fn(() => of(associations))
    const findOne = vi.fn(() => denied ? throwError(() => new Error('Denied')) : of({
      id, pseudo: 'Test', firstName: '', lastName: '', preferedColor: '',
      user: null, playedMatchCount: count,
      permissions: { canViewPersonalInfo: personalInfo, canViewOtherMatches: admin, canEdit: admin },
    }))
    TestBed.configureTestingModule({
      imports: [EditPlayerModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
        { provide: Store, useValue: { selectSnapshot: () => 2, dispatch: vi.fn() } },
        { provide: PlayerService, useValue: { invalidateCache: vi.fn() } },
        { provide: UserCrudService, useValue: {
          findAll: () => of([{ id: 2, email: 'admin@example.test', isAdmin: admin }]),
        } },
      ],
    })
    TestBed.overrideProvider(PlayerCrudService, { useValue: { findOne, associations: () => of(associations), saveAssociation } })
    const fixture = TestBed.createComponent(EditPlayerComponent)
    await fixture.whenStable()
    return { element: fixture.nativeElement as HTMLElement, findOne, saveAssociation, fixture }
  }

  it.each([
    [0, "N'a jamais participé à une partie."],
    [1, 'A participé à 1 partie.'],
    [12, 'A participé à 12 parties.'],
  ])('displays the correct participation message for %s matches above the form', async (count, message) => {
    const { element } = await setup(count)
    const summary = element.querySelector('.participation-count')
    expect(summary?.textContent?.trim()).toBe(message)
    expect(summary?.nextElementSibling?.tagName).toBe('FORM')
  })

  it('does not display participation history when creating a player', async () => {
    const { element, findOne } = await setup(0, 0)
    expect(element.querySelector('.participation-count')).toBeNull()
    expect(findOne).not.toHaveBeenCalled()
  })

  it('lets an administrator change association rights without changing creator or association date', async () => {
    const { element, saveAssociation, fixture } = await setup(2)
    expect(element.querySelector('.associations')?.textContent).toContain('shared@example.test')
    const checkbox = element.querySelector<HTMLInputElement>('.associations input[type="checkbox"]')!
    checkbox.click()
    await fixture.whenStable()
    const button = element.querySelector<HTMLButtonElement>('.associations fieldset button')!
    button.click()
    await fixture.whenStable()
    expect(saveAssociation).toHaveBeenCalledWith(1, 3, {
      canViewPersonalInfo: true, canViewOtherMatches: false, canAddToMatch: false,
    })
    expect(fixture.componentInstance.newRights).toEqual({
      canViewPersonalInfo: false, canViewOtherMatches: false, canAddToMatch: false,
    })
  })

  it('hides association management and personal fields when permission is denied', async () => {
    const { element } = await setup(1, 1, false, false)
    expect(element.querySelector('.associations')).toBeNull()
    expect(element.querySelector('input[formControlName="prenom"]')).toBeNull()
    expect(element.querySelector('input[formControlName="nom"]')).toBeNull()
    expect(element.querySelector('mat-select[formControlName="user"]')).toBeNull()
    expect(element.querySelector('input[formControlName="pseudo"]')).not.toBeNull()
    expect(element.querySelector('mat-select[formControlName="couleur"]')).not.toBeNull()
  })

  it('does not claim a player never played when their match history is restricted', async () => {
    const { element } = await setup(0, 1, false, false)
    expect(element.querySelector('.participation-count')?.textContent).toContain('Aucune participation visible avec vos droits actuels')
  })

  it('reports loss of access rather than leaving the loading spinner running', async () => {
    const { element, fixture } = await setup(0, 1, false, false, true)
    expect(element.querySelector('[role="alert"]')?.textContent).toContain("vous n'y avez pas accès")
    expect(fixture.componentInstance.loading).toBe(false)
    expect(element.querySelector<HTMLElement>('.edit-player')?.hidden).toBe(true)
  })
})
