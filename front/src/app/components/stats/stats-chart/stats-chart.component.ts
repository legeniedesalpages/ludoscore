import { Component, computed, input } from '@angular/core'
import { DecimalPipe, NgTemplateOutlet } from '@angular/common'
import { StatisticsChart } from 'src/app/core/model/game-statistics.model'

@Component({
  imports: [DecimalPipe, NgTemplateOutlet],
  selector: 'app-stats-chart',
  styleUrl: './stats-chart.component.css',
  templateUrl: './stats-chart.component.html',
})
export class StatsChartComponent {
  readonly chart = input.required<StatisticsChart>()
  readonly colors = ['#2457a7', '#28734d', '#aa5500', '#b02f45', '#7350a2', '#087886']
  readonly series = computed(() => this.chart().columns.slice(1).map((title, column) => {
    const values = this.chart().rows.map((row, index) => ({
      label: String(row[0] ?? ''),
      value: typeof row[column + 1] === 'number' && Number.isFinite(row[column + 1]) ? Number(row[column + 1]) : null,
      color: this.colors[index % this.colors.length],
    }))
    const max = Math.max(...values.map(v => Math.abs(v.value ?? 0)), 1)
    const total = values.reduce((sum, item) => sum + Math.max(item.value ?? 0, 0), 0)
    const dates = values.map(item => {
      if (/^\d{4}-\d{2}$/.test(item.label)) return Date.parse(`${item.label}-01T00:00:00Z`)
      if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/.test(item.label)) {
        return Date.parse(`${item.label.replace(' ', 'T')}${item.label.length === 10 ? 'T00:00:00' : ':00'}Z`)
      }
      return NaN
    })
    const temporal = dates.length > 1 && dates.every(Number.isFinite)
    const first = temporal ? Math.min(...dates) : 0
    const span = temporal ? Math.max(...dates) - first : 0
    let offset = 0
    const points = values.map((item, index) => {
      const share = total > 0 ? Math.max(item.value ?? 0, 0) / total * 100 : 0
      const point = {
        ...item, share, offset,
        width: Math.abs(item.value ?? 0) / max * 100,
        x: temporal && span > 0 ? 20 + (dates[index] - first) / span * 560
          : values.length > 1 ? 20 + index / (values.length - 1) * 560 : 300,
        y: 110 - (item.value ?? 0) / max * 90,
      }
      offset += share
      return point
    })
    // Missing measurements interrupt the line instead of being plotted as zero.
    const segments: string[] = []
    let segment: string[] = []
    for (const point of points) {
      if (point.value === null) {
        if (segment.length) segments.push(segment.join(' '))
        segment = []
      } else {
        segment.push(`${point.x},${point.y}`)
      }
    }
    if (segment.length) segments.push(segment.join(' '))
    return { title, points, segments, total, nonNegative: values.every(p => p.value === null || p.value >= 0) }
  }))
}
