import { TestBed } from '@angular/core/testing'
import { describe, expect, it } from 'vitest'
import { StatsChartComponent } from './stats-chart.component'
import { StatisticsChart } from 'src/app/core/model/game-statistics.model'

describe('StatsChartComponent', () => {
  async function render(chart: StatisticsChart) {
    const fixture = TestBed.createComponent(StatsChartComponent)
    fixture.componentRef.setInput('chart', chart)
    await fixture.whenStable()
    return fixture
  }

  it('renders each numeric series and preserves zero and missing measurements', async () => {
    const fixture = await render({
      title: 'Par mois', type: 'line', columns: ['Mois', 'Parties', 'Minutes'],
      rows: [['Janvier', 2, 30], ['Février', 0, null], ['Mars', 3, 60]],
    })
    expect(fixture.nativeElement.querySelectorAll('svg').length).toBe(2)
    expect(fixture.componentInstance.series()[1].segments.length).toBe(2)
    expect(fixture.nativeElement.textContent).toContain('Février')
    expect(fixture.nativeElement.textContent).toContain('—')
    expect(fixture.nativeElement.querySelectorAll('table tbody tr').length).toBe(3)
  })

  it('renders a pie whose shares sum to one hundred percent', async () => {
    const fixture = await render({
      title: 'Victoires', type: 'pie', columns: ['Joueur', 'Victoires'], rows: [['Alice', 3], ['Bob', 1]],
    })

    const points = fixture.componentInstance.series()[0].points
    expect(points.map(p => p.share)).toEqual([75, 25])
    expect(points.map(p => p.offset)).toEqual([0, 75])
    expect(fixture.nativeElement.querySelectorAll('circle').length).toBe(2)
  })

  it('spaces time-series points by their actual date rather than their position', async () => {
    const fixture = await render({
      title: 'Durées', type: 'line', columns: ['Date', 'Minutes'],
      rows: [['2026-01-01 12:00', 20], ['2026-01-02 12:00', 30], ['2026-01-11 12:00', 10]],
    })
    expect(fixture.componentInstance.series()[0].points.map(p => p.x)).toEqual([20, 76, 580])
  })

  it('shows a meaningful empty state instead of a blank chart', async () => {
    const fixture = await render({ title: 'Vide', type: 'bar', columns: [], rows: [] })
    expect(fixture.nativeElement.textContent).toContain('Aucune donnée disponible')
  })

  it('does not turn text into executable HTML', async () => {
    const fixture = await render({
      title: '<script>test</script>', type: 'table', columns: ['Jeu', 'Parties'],
      rows: [['<img src=x onerror=alert(1)>', 2]], comment: '<b>Commentaire</b>',
    })
    expect(fixture.nativeElement.querySelector('script, img, b')).toBeNull()
    expect(fixture.nativeElement.textContent).toContain('<b>Commentaire</b>')
  })

  it.each(['Joueur', 'Vainqueur'])('formats %s labels in both charts and tables without altering data', async column => {
    const chart: StatisticsChart = {
      title: 'Victoires', type: 'bar', columns: [column, 'Victoires'], rows: [['élodieMc', 3]],
    }
    const fixture = await render(chart)
    expect(fixture.componentInstance.series()[0].points[0].label).toBe('ÉlodieMc')
    expect(fixture.nativeElement.querySelector('td').textContent).toBe('ÉlodieMc')
    expect(chart.rows[0][0]).toBe('élodieMc')
  })

  it('preserves game label capitalization', async () => {
    const fixture = await render({
      title: 'Jeux', type: 'bar', columns: ['Jeu', 'Parties'], rows: [['eXit', 3]],
    })
    expect(fixture.componentInstance.series()[0].points[0].label).toBe('eXit')
    expect(fixture.nativeElement.querySelector('td').textContent).toBe('eXit')
  })

  it('formats assistant chart labels when every measure is grouped by player', async () => {
    const fixture = await render({
      title: 'Résultats', type: 'bar', columns: ['Libellé', 'Victoires par joueur'], rows: [['renoMc', 3]],
    })
    expect(fixture.componentInstance.series()[0].points[0].label).toBe('RenoMc')
  })
})
