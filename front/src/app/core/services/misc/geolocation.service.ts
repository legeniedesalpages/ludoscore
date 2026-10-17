import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

export interface Position {
  latitude: number
  longitude: number
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {

  // Émet la position actuelle, ou null si elle est refusée, indisponible ou trop longue à obtenir : ne bloque jamais la création de partie.
  currentPosition(timeoutMs = 6000): Observable<Position | null> {
    return new Observable<Position | null>(subscriber => {
      if (!('geolocation' in navigator)) {
        subscriber.next(null)
        subscriber.complete()
        return
      }
      navigator.geolocation.getCurrentPosition(
        position => {
          subscriber.next({ latitude: position.coords.latitude, longitude: position.coords.longitude })
          subscriber.complete()
        },
        error => {
          console.warn('Géolocalisation indisponible :', error.message)
          subscriber.next(null)
          subscriber.complete()
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
      )
    })
  }
}
