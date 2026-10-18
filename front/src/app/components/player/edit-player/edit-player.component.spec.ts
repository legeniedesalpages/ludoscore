import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { PlayerAssociation, PlayerMergePreview } from 'src/app/core/entity/player-entity.model'
import { of, Subject, throwError } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { PlayerService } from 'src/app/core/services/player/player.service'
import { EditPlayerComponent } from './edit-player.component'
import { EditPlayerModule } from './edit-player.module'
import { Clipboard } from '@angular/cdk/clipboard'
import { HttpErrorResponse } from '@angular/common/http'
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed'
import { MatExpansionPanelHarness } from '@angular/material/expansion/testing'

describe('EditPlayerComponent participation count', () => {
  async function setup(count: number, id = 1, admin = true, personalInfo = true, denied = false, canMerge = false, archived = false, canManageAssociations = admin, personalizable = false, editable = admin) {
    const associations: PlayerAssociation[] = [{
      userId: 3, email: 'shared@example.test', isCreator: false, isSelf: false,
      canViewPersonalInfo: false, canViewOtherMatches: false, canAddToMatch: false,
      associatedAt: '2026-10-18T12:00:00',
    }, {
      userId: 4, email: 'creator@example.test', isCreator: true, isSelf: true,
      canViewPersonalInfo: true, canViewOtherMatches: true, canAddToMatch: true,
      associatedAt: '2026-10-17T12:00:00',
    }]
    const saveAssociation = vi.fn(() => of(associations))
    const loadAssociations = vi.fn(() => of(associations))
    const ludotag = vi.fn(() => of({ ludotag: 'ABCD-EFGH-JK23' }))
    const associateLudotag = vi.fn(() => of({ id: 7, pseudo: 'Shared' }))
    const savePersonalPseudo = vi.fn(() => of({ id, pseudo: 'My nickname', creatorPseudo: 'Test', personalPseudo: 'My nickname' }))
    const preview: PlayerMergePreview = {
      replaced: { id, pseudo: 'Test' }, survivor: { id: 7, pseudo: 'Other player' },
      matchCount: 3, participationCount: 4, conflictMatchIds: [],
    }
    const previewMerge = vi.fn(() => of(preview))
    const merge = vi.fn(() => of({ ...preview, mergeId: 1 }))
    const invalidateCache = vi.fn()
    const dispatch = vi.fn()
    const copy = vi.fn(() => true)
    const findOne = vi.fn(() => denied ? throwError(() => new Error('Denied')) : of({
      id, pseudo: 'Test', firstName: '', lastName: '', preferedColor: '',
      user: null, playedMatchCount: count,
      replacedByPlayerId: archived ? 9 : null, status: archived ? 'replaced' : 'active',
      permissions: { canViewPersonalInfo: personalInfo, canViewOtherMatches: admin, canEdit: editable && !archived, canMerge, canManageAssociations: canManageAssociations && !archived, canPersonalize: personalizable && !archived },
    }))
    TestBed.configureTestingModule({
      imports: [EditPlayerModule],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
        { provide: Store, useValue: { selectSnapshot: () => 2, dispatch } },
        { provide: PlayerService, useValue: { invalidateCache } },
        { provide: Clipboard, useValue: { copy } },
        { provide: UserCrudService, useValue: {
          findAll: () => of([{ id: 2, email: 'admin@example.test', isAdmin: admin }]),
        } },
      ],
    })
    TestBed.overrideProvider(PlayerCrudService, { useValue: { findOne, associations: loadAssociations, saveAssociation, ludotag, associateLudotag, previewMerge, merge, savePersonalPseudo } })
    const fixture = TestBed.createComponent(EditPlayerComponent)
    await fixture.whenStable()
    return { element: fixture.nativeElement as HTMLElement, findOne, saveAssociation, loadAssociations, fixture, ludotag, associateLudotag, invalidateCache, dispatch, copy, previewMerge, merge, preview, savePersonalPseudo }
  }

  it('collapses every secondary action by default and allows independent expansion', async () => {
    const { fixture } = await setup(1, 1, true, true, false, true, false, true, true)
    const loader = TestbedHarnessEnvironment.loader(fixture)
    const panels = await loader.getAllHarnesses(MatExpansionPanelHarness)
    expect(await Promise.all(panels.map(panel => panel.getTitle()))).toEqual([
      'Votre pseudo pour ce joueur', 'Partager ce joueur',
      'Remplacer ce joueur par un autre', 'Utilisateurs associés',
    ])
    expect(await Promise.all(panels.map(panel => panel.isExpanded()))).toEqual([false, false, false, false])
    await panels[1].expand()
    await panels[2].expand()
    expect(await panels[1].isExpanded()).toBe(true)
    expect(await panels[2].isExpanded()).toBe(true)
    await panels[1].collapse()
    expect(await panels[1].isExpanded()).toBe(false)
    expect(await panels[2].isExpanded()).toBe(true)
  })

  it('preserves a personal nickname draft when its panel is closed and reopened', async () => {
    const { fixture } = await setup(1, 1, false, false, false, false, false, false, true)
    const loader = TestbedHarnessEnvironment.loader(fixture)
    const panel = await loader.getHarness(MatExpansionPanelHarness.with({ title: 'Votre pseudo pour ce joueur' }))
    await panel.expand()
    fixture.componentInstance.personalPseudoInput.setValue('Mon ami')
    await panel.collapse()
    await panel.expand()
    expect(fixture.componentInstance.personalPseudoInput.value).toBe('Mon ami')
  })

  it.each([true, false])('does not show secondary action panels on creation or archived players: creation=%s', async creating => {
    const { fixture } = await setup(0, creating ? 0 : 1, true, true, false, false, !creating)
    const loader = TestbedHarnessEnvironment.loader(fixture)
    expect(await loader.getAllHarnesses(MatExpansionPanelHarness)).toHaveLength(0)
  })

  it('lets a shared non-editor choose a personal nickname without modifying the canonical name', async () => {
    const { element, fixture, savePersonalPseudo, invalidateCache } = await setup(1, 1, false, false, false, false, false, false, true)
    const section = element.querySelector<HTMLElement>('.personal-pseudo')!
    expect(section.textContent).toContain('Test')
    const input = section.querySelector<HTMLInputElement>('input')!
    expect(input.matches(':disabled')).toBe(false)
    expect(element.querySelector<HTMLInputElement>('input[formControlName="pseudo"]')?.disabled).toBe(true)
    input.value = '  My nickname  '
    input.dispatchEvent(new Event('input'))
    await fixture.whenStable()
    section.querySelector<HTMLButtonElement>('button')!.click()
    await fixture.whenStable()
    expect(savePersonalPseudo).toHaveBeenCalledWith(1, 'My nickname')
    expect(fixture.componentInstance.playerEditorForm.get('pseudo')?.value).toBe('Test')
    expect(invalidateCache).toHaveBeenCalledOnce()
  })

  it('disables every canonical field for a viewer even when personal information is visible', async () => {
    const { element, fixture } = await setup(1, 1, false, true)
    expect(fixture.componentInstance.playerEditorForm.disabled).toBe(true)
    for (const name of ['pseudo', 'prenom', 'nom']) {
      expect(element.querySelector<HTMLInputElement>(`input[formControlName="${name}"]`)?.disabled).toBe(true)
    }
    for (const name of ['couleur', 'user']) {
      expect(element.querySelector(`mat-select[formControlName="${name}"]`)?.getAttribute('aria-disabled')).toBe('true')
    }
    const save = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.includes('Enregistrer le joueur'))!
    expect(save.hidden).toBe(true)
    fixture.componentInstance.save()
    expect(fixture.componentInstance.saving).toBe(false)
  })

  it('allows a non-admin editor to change player fields but not the account association', async () => {
    const { element, fixture } = await setup(1, 1, false, true, false, false, false, false, false, true)
    for (const field of ['pseudo', 'prenom', 'nom', 'couleur']) {
      expect(fixture.componentInstance.playerEditorForm.get(field)?.enabled).toBe(true)
    }
    expect(fixture.componentInstance.playerEditorForm.get('user')?.disabled).toBe(true)
    expect(element.querySelector('mat-select[formControlName="user"]')?.getAttribute('aria-disabled')).toBe('true')
  })

  it('keeps creation fields editable and administrator identity controls enabled only when editable', async () => {
    const { fixture } = await setup(0, 0, true)
    expect(fixture.componentInstance.playerEditorForm.enabled).toBe(true)
    expect(fixture.componentInstance.playerEditorForm.get('user')?.enabled).toBe(true)
  })

  it('shows a failure when saving a personal nickname fails', async () => {
    const { element, fixture, savePersonalPseudo } = await setup(1, 1, false, false, false, false, false, false, true)
    savePersonalPseudo.mockReturnValueOnce(throwError(() => new Error('Offline')))
    element.querySelector<HTMLButtonElement>('.personal-pseudo button')!.click()
    await fixture.whenStable()
    expect(savePersonalPseudo).toHaveBeenCalledWith(1, null)
    expect(element.querySelector('.personal-pseudo [role="alert"]')?.textContent).toContain("Impossible d'enregistrer")
    expect(fixture.componentInstance.personalPseudoSaving).toBe(false)
  })

  it('sends an optional personal nickname when adding a player by ludotag', async () => {
    const { element, fixture, associateLudotag } = await setup(0, 0, false)
    const inputs = element.querySelectorAll<HTMLInputElement>('.ludotag input')
    inputs[0].value = 'abcd-efgh-jk23'
    inputs[0].dispatchEvent(new Event('input'))
    inputs[1].value = 'My friend'
    inputs[1].dispatchEvent(new Event('input'))
    await fixture.whenStable()
    element.querySelector<HTMLButtonElement>('.ludotag button')!.click()
    await fixture.whenStable()
    expect(associateLudotag).toHaveBeenCalledWith('abcd-efgh-jk23', 'My friend')
  })

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
    const { element, loadAssociations } = await setup(1, 1, false, false)
    expect(element.querySelector('.associations')).toBeNull()
    expect(loadAssociations).not.toHaveBeenCalled()
    expect(element.querySelector('input[formControlName="prenom"]')).toBeNull()
    expect(element.querySelector('input[formControlName="nom"]')).toBeNull()
    expect(element.querySelector('mat-select[formControlName="user"]')).toBeNull()
    expect(element.querySelector('input[formControlName="pseudo"]')).not.toBeNull()
    expect(element.querySelector('mat-select[formControlName="couleur"]')).not.toBeNull()
  })

  it.each([true, false])('excludes the creator entirely from the association list for admin=%s', async admin => {
    const { element } = await setup(1, 1, admin, true, false, false, false, true)
    const fieldsets = Array.from(element.querySelectorAll<HTMLFieldSetElement>('.associations fieldset'))
    expect(element.querySelector('.associations')?.textContent).not.toContain('creator@example.test')
    expect(element.querySelector('.associations')?.textContent).not.toContain('17/10/2026')
    const recipient = fieldsets.find(fieldset => fieldset.querySelector('legend')?.textContent?.includes('shared@example.test'))!
    expect(recipient.querySelectorAll('input[type="checkbox"]')).toHaveLength(3)
    expect(recipient.textContent).toContain('Enregistrer les droits')
  })

  it('lets a non-admin manager see recipients, refresh and grant rights without adding or removing accounts', async () => {
    const { element, fixture, loadAssociations, saveAssociation } = await setup(1, 1, false, true, false, false, false, true)
    const section = element.querySelector<HTMLElement>('.associations')!
    expect(section.textContent).toContain('shared@example.test')
    expect(section.textContent).toContain('18/10/2026')
    expect(section.querySelector('select')).toBeNull()
    expect(section.textContent).not.toContain("Retirer l'association")
    section.querySelector<HTMLButtonElement>('button')!.click()
    await fixture.whenStable()
    expect(loadAssociations).toHaveBeenCalledTimes(2)
    section.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click()
    await fixture.whenStable()
    section.querySelector<HTMLButtonElement>('fieldset button')!.click()
    await fixture.whenStable()
    expect(saveAssociation).toHaveBeenCalledWith(1, 3, {
      canViewPersonalInfo: true, canViewOtherMatches: false, canAddToMatch: false,
    })
  })

  it('reports association load and save failures without claiming success', async () => {
    const { element, fixture, loadAssociations, saveAssociation } = await setup(1, 1, false, true, false, false, false, true)
    loadAssociations.mockReturnValueOnce(throwError(() => new Error('Offline')))
    element.querySelector<HTMLButtonElement>('.associations button')!.click()
    await fixture.whenStable()
    expect(element.querySelector('.associations [role="alert"]')?.textContent).toContain('Impossible de charger')
    element.querySelector<HTMLButtonElement>('.associations button')!.click()
    await fixture.whenStable()
    saveAssociation.mockReturnValueOnce(throwError(() => new Error('Forbidden')))
    element.querySelector<HTMLButtonElement>('.associations fieldset button')!.click()
    await fixture.whenStable()
    expect(element.querySelector('.associations [role="alert"]')?.textContent).toContain("Impossible d'enregistrer")
    expect(fixture.componentInstance.associationSaving).toBe(false)
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

  it('lets an associated non-editor display and copy the ludotag without personal info rights', async () => {
    const { element, fixture, ludotag, copy } = await setup(0, 1, false, false)
    expect(ludotag).not.toHaveBeenCalled()
    const section = element.querySelector<HTMLElement>('.ludotag')!
    section.querySelector<HTMLButtonElement>('button')!.click()
    await fixture.whenStable()
    expect(ludotag).toHaveBeenCalledWith(1)
    expect(section.querySelector('.ludotag-code')?.textContent?.trim()).toBe('ABCD-EFGH-JK23')
    section.querySelector<HTMLButtonElement>('button')!.click()
    expect(copy).toHaveBeenCalledWith('ABCD-EFGH-JK23')
  })

  it('reports tag loading failure and lets the user retry', async () => {
    const { element, fixture, ludotag } = await setup(0)
    ludotag.mockReturnValueOnce(throwError(() => new Error('Offline')))
    fixture.componentInstance.showLudotag()
    await fixture.whenStable()
    expect(element.querySelector('.ludotag [role="alert"]')?.textContent).toContain('Impossible de charger')
    expect(fixture.componentInstance.ludotagLoading).toBe(false)
    fixture.componentInstance.showLudotag()
    await fixture.whenStable()
    expect(element.querySelector('.ludotag-code')).not.toBeNull()
  })

  it('associates an existing player from the creation screen, invalidates cache and returns to the list', async () => {
    const { element, fixture, associateLudotag, invalidateCache, dispatch } = await setup(0, 0, false)
    const input = element.querySelector<HTMLInputElement>('.ludotag input')!
    input.value = 'abcd-efgh-jk23'
    input.dispatchEvent(new Event('input'))
    await fixture.whenStable()
    element.querySelector<HTMLButtonElement>('.ludotag button')!.click()
    await fixture.whenStable()
    expect(associateLudotag).toHaveBeenCalledWith('abcd-efgh-jk23')
    expect(invalidateCache).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ path: ['/manage-player'] }))
  })

  it.each(['', 'ABC', 'ABCD-0000-EFGH', 'ABCD-EFGH-JK23Z'])('rejects malformed ludotag %s without an API call', async tag => {
    const { fixture, associateLudotag } = await setup(0, 0)
    fixture.componentInstance.ludotagInput.setValue(tag)
    fixture.componentInstance.associateLudotag()
    expect(associateLudotag).not.toHaveBeenCalled()
    expect(fixture.componentInstance.ludotagInput.invalid).toBe(true)
  })

  it.each([
    [422, 'invalide ou introuvable'],
    [429, 'Trop de tentatives'],
    [500, "Impossible d'associer"],
  ])('reports association error %s and keeps the input for retry', async (status, message) => {
    const { element, fixture, associateLudotag, invalidateCache, dispatch } = await setup(0, 0)
    associateLudotag.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status })))
    fixture.componentInstance.ludotagInput.setValue('ABCDEFGHJK23')
    fixture.componentInstance.associateLudotag()
    await fixture.whenStable()
    expect(element.querySelector('.ludotag [role="alert"]')?.textContent).toContain(message)
    expect(fixture.componentInstance.joining).toBe(false)
    expect(fixture.componentInstance.ludotagInput.value).toBe('ABCDEFGHJK23')
    expect(invalidateCache).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('hides merging from users without creator or personal identity rights', async () => {
    const { element } = await setup(0, 1, false, false)
    expect(element.querySelector('.merge-player')).toBeNull()
  })

  it('previews the direction and counts, then requires explicit confirmation before merging', async () => {
    const { fixture, element, previewMerge, merge, invalidateCache, dispatch } = await setup(0, 1, false, false, false, true)
    const input = element.querySelector<HTMLInputElement>('.merge-player input')!
    input.value = 'abcd-efgh-jk23'
    input.dispatchEvent(new Event('input'))
    await fixture.whenStable()
    element.querySelector<HTMLButtonElement>('.merge-player button')!.click()
    await fixture.whenStable()
    expect(previewMerge).toHaveBeenCalledWith(1, 'abcd-efgh-jk23')
    expect(element.querySelector('.merge-player')?.textContent).toContain('Other player')
    expect(element.querySelector('.merge-player')?.textContent).toContain('Test (n° 1) sera remplacé par Other player (n° 7)')
    expect(element.querySelector('.merge-player')?.textContent).toContain('4 participation(s) dans 3 partie(s)')
    expect(element.querySelector('.merge-player')?.textContent).toContain('sans aucun droit par défaut pour les nouveaux liens')
    fixture.componentInstance.confirmMerge()
    expect(merge).not.toHaveBeenCalled()
    const checkbox = element.querySelector<HTMLInputElement>('.merge-player input[type="checkbox"]')!
    checkbox.click()
    await fixture.whenStable()
    const confirm = Array.from(element.querySelectorAll<HTMLButtonElement>('.merge-player button')).find(button => button.textContent?.includes('Confirmer'))!
    confirm.click()
    await fixture.whenStable()
    expect(merge).toHaveBeenCalledWith(1, 'abcd-efgh-jk23')
    expect(invalidateCache).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ path: ['/manage-player'] }))
  })

  it('blocks conflicts and allows canceling preview without modifying data', async () => {
    const { fixture, element, previewMerge, merge, preview } = await setup(0, 1, true, true, false, true)
    previewMerge.mockReturnValueOnce(of({ ...preview, conflictMatchIds: [12, 34] }))
    fixture.componentInstance.mergeLudotagInput.setValue('ABCDEFGHJK23')
    fixture.componentInstance.previewMerge()
    await fixture.whenStable()
    expect(element.querySelector('.merge-player [role="alert"]')?.textContent).toContain('12, 34')
    expect(element.querySelector('.merge-player input[type="checkbox"]')).toBeNull()
    fixture.componentInstance.mergeConfirmed.setValue(true)
    fixture.componentInstance.confirmMerge()
    expect(merge).not.toHaveBeenCalled()
    const cancel = Array.from(element.querySelectorAll<HTMLButtonElement>('.merge-player button')).find(button => button.textContent?.includes('Annuler'))!
    cancel.click()
    await fixture.whenStable()
    expect(element.querySelector('.merge-player form')).not.toBeNull()
  })

  it('requires a new preview after server rejects a confirmation and displays the failure', async () => {
    const { fixture, element, merge, invalidateCache } = await setup(0, 1, true, true, false, true)
    fixture.componentInstance.mergeLudotagInput.setValue('ABCDEFGHJK23')
    fixture.componentInstance.previewMerge()
    fixture.componentInstance.mergeConfirmed.setValue(true)
    merge.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 422, error: { message: 'Fusion bloquee : partie 42.' },
    })))
    fixture.componentInstance.confirmMerge()
    await fixture.whenStable()
    expect(element.querySelector('.merge-player [role="alert"]')?.textContent).toContain('partie 42')
    expect(fixture.componentInstance.mergePreview).toBeUndefined()
    expect(fixture.componentInstance.mergeLoading).toBe(false)
    expect(invalidateCache).not.toHaveBeenCalled()
  })

  it('renders archived players read-only without sharing or association controls', async () => {
    const { element, fixture } = await setup(0, 1, true, true, false, false, true)
    expect(element.querySelector('[role="status"]')?.textContent).toContain('remplacé')
    expect(element.querySelector('.ludotag')).toBeNull()
    expect(element.querySelector('.associations')).toBeNull()
    expect(element.querySelector<HTMLFieldSetElement>('form fieldset')?.disabled).toBe(true)
    expect(fixture.componentInstance.playerEditorForm.disabled).toBe(true)
    expect(element.querySelector('mat-select[formControlName="couleur"]')?.getAttribute('aria-disabled')).toBe('true')
  })

  it('ignores a preview arriving after leaving the player screen', async () => {
    const { fixture, previewMerge, preview } = await setup(0, 1, true, true, false, true)
    const pending = new Subject<PlayerMergePreview>()
    previewMerge.mockReturnValueOnce(pending)
    fixture.componentInstance.mergeLudotagInput.setValue('ABCDEFGHJK23')
    fixture.componentInstance.previewMerge()
    fixture.destroy()
    pending.next(preview)
    expect(fixture.componentInstance.mergePreview).toBeUndefined()
    pending.complete()
  })

  it('does not confirm a preview belonging to a different replaced player', async () => {
    const { fixture, merge, preview } = await setup(0, 1, true, true, false, true)
    fixture.componentInstance.mergePreview = { ...preview, replaced: { id: 99, pseudo: 'Other' } }
    fixture.componentInstance.mergeConfirmed.setValue(true)
    fixture.componentInstance.confirmMerge()
    expect(merge).not.toHaveBeenCalled()
  })
})
