import { Injectable } from '@angular/core';
import { InjectableRxStompConfig } from '@stomp/ng2-stompjs';
import { AuthenticationService } from '../authentication/authentication.service';
import * as SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StompConfigurationService extends InjectableRxStompConfig {
  constructor(private auth: AuthenticationService) {
    super();
  }

  webSocketFactory = () => new SockJS(`${environment.apiUrl}/websocket?accessToken=${this.auth.user.accessToken}`);
}
