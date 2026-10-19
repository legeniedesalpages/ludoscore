/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 17/07/2025 - 11:02:42
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 17/07/2025
    * - Author          : renau
    * - Modification    : 
**/
/**
 * @description      : Service for formatting match-related information
 * @created          : 17/07/2025
 */
import { DatePipe } from '@angular/common'
import { Injectable } from '@angular/core'
import { MatchModel } from '../../model/match.model'
import { displayPlayerName } from '../../pipes/player-name.pipe'

export const NOT_DETERMINED = '(non déterminé)'

@Injectable({
  providedIn: 'root'
})
export class MatchFormatterService {

  private datePipe
  
  constructor() {
    this.datePipe = new DatePipe('fr')
  }

  /**
   * Formats a line describing the match status with date information
   * @param match The match model to format
   * @param withHtml Whether to include HTML formatting (for list view)
   * @param includeTeams Whether to include team information
   */
  public line(match: MatchModel): string {
    let headline: string;
    
    if (match.canceled) {
      const cancelledText = "<span class='accent'>Annulée</span>"
      headline = match.endedAt
        ? `${cancelledText} le ${this.datePipe.transform(match.endedAt, 'dd/MM/yyyy')} à ${this.datePipe.transform(match.endedAt, 'HH:mm')}`
        : `${cancelledText} le ${this.datePipe.transform(match.startedAt, 'dd/MM/yyyy') ?? NOT_DETERMINED}`
    } else if (!match.endedAt && (match.running ?? true)) {
      const ongoingText = "<span class='emphase'>En cours</span>"
      const sinceStart = this.elapsedTime(match.startedAt, new Date())
      headline = sinceStart === NOT_DETERMINED ? ongoingText : `${ongoingText} depuis ${sinceStart}`
    } else {
      const playedDate = this.datePipe.transform(match.endedAt ?? match.startedAt, 'dd/MM/yyyy') ?? NOT_DETERMINED
      const duration = match.endedAt ? this.elapsedTime(match.startedAt, new Date(match.endedAt)) : NOT_DETERMINED
      headline = duration === NOT_DETERMINED ? `Jouée le ${playedDate}` : `Jouée le ${playedDate} en ${duration}`
    }

    return headline;
  }

  public teamLine(match: MatchModel): string {
      let headline: string

      headline = match.teams.map(team => {
        const name = this.escapeText(displayPlayerName(team.displayName ?? team.name))
        const label = team.id == match.winningTeam?.id ? '<b>' + name + '</b>' : name
        return label + (team.creatorPseudo
          ? ' <small class="player-creator-pseudo">(' + this.escapeText(displayPlayerName(team.creatorPseudo)) + ')</small>' : '')
      }).join(', ')
    
    return headline
}

  private escapeText(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
  }

  /**
   * Calculates and formats the elapsed time between two dates.
   * Returns "(non déterminé)" when a date is missing/invalid or when the end precedes the start.
   */
  public elapsedTime(startDate: Date | string | undefined | null, endDate: Date | string | undefined | null): string {
    if (!startDate || !endDate) {
      return NOT_DETERMINED
    }
    const t = new Date(endDate).getTime() - new Date(startDate).getTime()
    if (Number.isNaN(t) || t < 0) {
      return NOT_DETERMINED
    }
    const minutes = "" + Math.floor((t / (1000 * 60)) % 60)
    const hours = "" + Math.floor(t / (1000 * 60 * 60))
    
    if (hours === "0") {
      return minutes + " minutes";
    }
    return hours + " heures et " + minutes + " mn";
  }
}
