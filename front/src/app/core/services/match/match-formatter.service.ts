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
      headline = `${cancelledText} le ${this.datePipe.transform(match.endedAt, 'dd/MM/yyyy')} à ${this.datePipe.transform(match.endedAt, 'HH:mm')}`
    } else if (!match.endedAt) {
      const ongoingText = "<span class='emphase'>En cours</span>"
      headline = `${ongoingText} depuis ${this.elapsedTime(match.startedAt!, new Date())}`
    } else {
      headline = `Jouée le ${this.datePipe.transform(match.endedAt, 'dd/MM/yyyy')} en ${this.elapsedTime(match.startedAt!, new Date(match.endedAt))}`
    }

    return headline;
  }

  public teamLine(match: MatchModel): string {
      let headline: string

      headline = match.teams.map(team => 
        team.id == match.winningTeam?.id  
          ? '<b>' + team.name + '</b>' 
          : team.name
      ).join(', ')
    
    return headline
}

  /**
   * Calculates and formats the elapsed time between two dates
   */
  public elapsedTime(startDate: Date, endDate: Date): string {
    let t = endDate.getTime() - new Date(startDate).getTime();
    let minutes = "" + Math.floor((t / (1000 * 60)) % 60);
    let hours = "" + Math.floor((t / (1000 * 60 * 60)) % 24);
    
    if (hours === "0") {
      return minutes + " minutes";
    }
    return hours + " heures et " + minutes + " mn";
  }
}
