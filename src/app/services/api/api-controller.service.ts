import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Dimension } from '../../models/dimension.enum';
import { environment } from '../../../environments/environment';
import { filter, map, tap } from 'rxjs/operators';
import { Cluster } from '../../models/cluster';
import { Observable, of, PartialObserver } from 'rxjs';
import { Player } from '../../models/player';
import { TrackHistory } from '../../models/track-history';
import { PlayerStatus } from '../../models/player-status';
import { SessionGroup } from '../../models/player-session';
import { Track } from '../../models/track';
import { Client } from '@stomp/stompjs';
import { Subscription } from 'stompjs';

@Injectable({
  providedIn: 'root'
})
export class ApiControllerService {
  constructor(private http: HttpClient) {
  }

  getRootClusters(server?: string, dimension?: Dimension): Observable<Cluster[]> {
    return this.http.post(`${environment.apiUrl}/api/root-clusters`, null, {
      params: {
        server: server,
        dimension: '' + dimension
      }
    }).pipe(
      map(body => body as Cluster[]),
      tap(clusters => clusters.forEach(cluster => {
        ApiControllerService.fixDimension(cluster);
        ApiControllerService.fixUpdatedAt(cluster);
      }))
    );
  }

  getClusterChildren(clusterId: number): Observable<Cluster> {
    return this.http.post(`${environment.apiUrl}/api/cluster`, null, {
      params: {
        clusterId: '' + clusterId
      }
    }).pipe(
      map(body => body as Cluster),
      tap(cluster => ApiControllerService.fixDimension(cluster))
    );
  }

  getClusterAssociations(clusterId: number): Observable<Player[]> {
    return this.http.post(`${environment.apiUrl}/api/cluster-associations`, null, {
      params: {
        clusterId: '' + clusterId
      }
    }).pipe(map(response => response as Player[]));
  }

  getTrackHistory(trackId: number, max?: number, aggregationMs: number = 10_000): Observable<TrackHistory[]> {
    return this.http.post(`${environment.apiUrl}/api/full-track-history`, null, {
      params: {
        trackId: '' + trackId,
        max: '' + max,
        aggregationMs: '' + aggregationMs
      }
    }).pipe(
      map(response => response as TrackHistory[]),
      tap(history => history.forEach(track => ApiControllerService.fixDimension(track)))
    )
  }

  getBotStatuses(): Observable<PlayerStatus[]> {
    return this.http.get(`${environment.apiUrl}/api/bot-statuses`)
      .pipe(
        map(body => body as PlayerStatus[]),
        tap(statuses => statuses.forEach(s => {
          ApiControllerService.fixDimension(s);
          ApiControllerService.fixUpdatedAt(s);
        }))
      );
  }

  getPlayerSessions(playerUuids: string[], server?: string, since?: number): Observable<SessionGroup[]> {
    return this.http.post(`${environment.apiUrl}/api/player-sessions`, null, {
      params: {
        playerUuids: playerUuids,
        server: server,
        from: '' + since
      }
    }).pipe(
      map(body => body as SessionGroup[]),
      filter(groups => groups.length > 0),
      tap(groups => groups.forEach(group => group.sessions.forEach(session => ApiControllerService.fixSessionDates(session))))
    )
  }

  trackerListener(client: Client, cb: PartialObserver<Track[]>): Subscription {
    return client.subscribe('/ws-user/ws-subscribe/tracker',
      message => of(message.body)
        .pipe(
          // parse response body and cast it to a track model
          map(body => JSON.parse(body) as Track[]),
          // fix track data having wrong types
          tap(tracks => tracks.forEach(track => ApiControllerService.fixDimension(track)))
        ).subscribe(cb));
  }

  requestTrackerUpdate(client: Client, server: string, startTime?: number, since: number = 15_000) {
    client.publish({
      destination: '/ws-api/tracking',
      body: JSON.stringify({
        server: server,
        duration: since,
        time: startTime
      })
    });
  }

  private static fixDimension(o: { dimension?: Dimension | string }) {
    // the data from the api uses strings to represent dimensions
    // we must convert them to the enum type
    if (typeof o.dimension === 'string') {
      o.dimension = Dimension[o.dimension];
    }
  }

  private static fixUpdatedAt(o: { updatedAt?: Date | any }) {
    if(typeof o.updatedAt === 'number' || typeof o.updatedAt === 'string') {
      o.updatedAt = new Date(o.updatedAt);
    }
  }

  private static fixSessionDates(o: { join?: string | number | Date, leave?: string | number | Date }) {
    if (typeof o.join === 'string' || typeof o.join === 'number') {
      o.join = new Date(o.join);
    }
    if (typeof o.leave === 'string' || typeof o.leave === 'number') {
      o.leave = new Date(o.leave);
    }
  }
}
