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
import { Injectable } from '@angular/core';
import { Channel } from 'pusher-js';
import Pusher from 'pusher-js';

@Injectable({ providedIn: 'root' })
export class PusherService {

    private pusher: Pusher
    private channel: Channel

    constructor() {
        console.info("Enabling pusher")
        this.pusher = new Pusher('38b8aa27d92ef96861d1', {
            cluster: 'eu'
        });
        this.channel = this.pusher.subscribe('events-channel')
        this.channel.bind('my-event', function (data: any) {
            console.log("pusher", JSON.stringify(data))
        });
    }

    public init() {
        console.log("init")
    }
}