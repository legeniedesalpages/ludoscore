/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 24/01/2023 - 10:39:47
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 24/01/2023
    * - Author          : renau
    * - Modification    : 
**/
import { Injectable, OnDestroy } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Channel } from 'pusher-js'
import Pusher from 'pusher-js'
import { environment } from 'src/environments/environment'

@Injectable({ providedIn: 'root' })
export class PusherService implements OnDestroy {

    private pusher: Pusher
    private channel: Channel
    private channel2: Channel

    constructor(private snackBar: MatSnackBar) {
        console.info("Enabling pusher")
        this.pusher = new Pusher(environment.pusherApiKey, {
            cluster: 'eu'
        })
        this.channel = this.pusher.subscribe('events-channel')
        this.channel.bind('my-event', (data: any) => {
            console.log("pusher", JSON.stringify(data))
            this.snackBar.open("Msg: " + data, 'Fermer', {
                duration: 5000
            })
        })

        this.channel2 = this.pusher.subscribe('user-connection')
        this.channel2.bind('App\\Events\\UserConnected', (data: any) => {
            this.snackBar.open("Msg2: " + data, 'Fermer', {
                duration: 5000
            })
        })
    }
    ngOnDestroy(): void {
        this.channel.disconnect()
        this.channel2.disconnect()
    }

    public init() {
        console.log("init")
    }
}