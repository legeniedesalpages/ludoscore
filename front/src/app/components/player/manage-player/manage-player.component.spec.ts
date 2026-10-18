import { CommonModule } from '@angular/common'
import { TestBed } from '@angular/core/testing'
import { MatButtonModule } from '@angular/material/button'
import { provideRouter } from '@angular/router'
import { Store } from '@ngxs/store'
import { of } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'
import { PlayerCrudService } from 'src/app/core/services/crud/player-crud.service'
import { UserCrudService } from 'src/app/core/services/crud/user-crud.service'
import { LayoutComponent } from '../../layout/layout.component'
import { LoadingSpinnerModule } from '../../layout/spinner/loading-spinner.module'
import { ManagePlayerComponent } from './manage-player.component'

describe('ManagePlayerComponent creator attribution', () => {
  async function setup(isAdmin: boolean, linkedAccount: boolean, hasCreatorPlayer: boolean, personalized = false) {
    const player = {
      id: 1, pseudo: 'Guest', firstName: '', lastName: '', gravatar: '',
      creatorPseudo: personalized ? 'Canonical name' : null,
      preferedColor: '', createdAt: undefined,
      user: linkedAccount ? { id: 3, email: 'linked@example.test' } : null,
      creator: {
        id: 2, email: 'creator@example.test',
        player: hasCreatorPlayer ? { id: 4, pseudo: 'Creator pseudo' } : null,
      },
    }
    TestBed.configureTestingModule({
      declarations: [ManagePlayerComponent],
      imports: [CommonModule, MatButtonModule, LayoutComponent, LoadingSpinnerModule],
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
    expect(element.querySelector('.creator')?.textContent).toContain('creator@example.test')
    expect(element.querySelector('.creator-player')?.textContent).toContain('Creator pseudo')
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

  it('shows the personal nickname with the canonical name in smaller supporting text', async () => {
    const element = await setup(false, false, false, true)
    expect(element.querySelector('.heading')?.textContent).toContain('Guest')
    expect(element.querySelector('small.player-creator-pseudo')?.textContent).toBe('(Canonical name)')
  })
})
