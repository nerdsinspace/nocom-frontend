import { Component, OnDestroy, OnInit } from '@angular/core';
import { fixPlayerStatus, PlayerStatus } from '../../models/player-status';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { filter, map, tap } from 'rxjs/operators';
import { fixSessionDates, SessionGroup } from '../../models/player-session';
import * as moment from 'moment';
import { duration } from 'moment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  statuses = [] as PlayerStatusExt[];
  revision = 0;
  data = [];
  layout = {
    uirevision: 0,
    barmode: 'stack',
    showlegend: false,
    hoverdistance: 200,
    hovermode: 'closest',
    // dragmode: 'pan',
    xaxis: {
      range: [0, 0],
      // visible: false,
      tickmode: 'array',
      tickvals: [],
      ticktext: [],
      tickangle: -90
    },
    yaxis: {
      tickvals: [],
      fixedrange: true
    }
  };
  config = {
    scrollZoom: false
  };

  private lastSessionUpdate: number = null;
  private updatingSessions = false;
  private needsUpdate = false;
  private needsLayoutUpdate = false;
  private lockGuard = false;
  private intervals = [];

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    while (this.intervals.length > 0) {
      clearInterval(this.intervals.pop());
    }
  }

  onPlotInit() {
    this.layoutTicks();
    this.updateStatuses();
    this.intervals.push(setInterval(() => this.updateStatuses(), 2500));
  }

  onRelayout(event) {
    this.layoutTicks();
  }

  private updateStatuses() {
    this.http.get(`${environment.apiUrl}/api/bot-statuses`)
      .pipe(
        map(body => body as PlayerStatusExt[]),
        tap(_statuses => _statuses.forEach(s => {
          fixPlayerStatus(s);
          s.timeElapsed = moment(s.updatedAt).fromNow();
        }))
      ).subscribe({
      next: _statuses => this.onUpdateStatuses(_statuses),
      error: err => console.error('Failed to get bot statuses', err)
    });
  }

  private onUpdateStatuses(statuses: PlayerStatusExt[]) {
    this.needsLayoutUpdate = false;
    statuses.filter(v => v.playerUsername !== null)
      .sort((a, b) => a.playerUsername.localeCompare(b.playerUsername))
      .forEach(status => {
        let pl = this.statuses.filter(v => v.playerUuid === status.playerUuid).pop();
        if (pl == null) {
          // add if entry does not exist
          pl = status;
          this.statuses.push(pl);
          this.layout.yaxis.tickvals.unshift(pl.playerUsername);
          this.needsLayoutUpdate = true;
        }
        Object.assign(pl, status);
      });

    if (this.needsLayoutUpdate) {
      this.needsLayoutUpdate = false;
      this.layout.uirevision++;
      this.revision++;
    }

    // prevent sessions from querying twice if the database is slow to respond
    if (!this.updatingSessions) {
      this.updatingSessions = true;
      this.http.post(`${environment.apiUrl}/api/player-sessions`, null, {
        params: {
          playerUuids: this.statuses.map(stat => stat.playerUuid),
          server: '2b2t.org',
          from: '' + (this.lastSessionUpdate == null
            ? duration(1, 'day').asMilliseconds()
            : moment().diff(this.lastSessionUpdate))
        }
      }).pipe(
        map(body => body as SessionGroup[]),
        filter(groups => groups.length > 0),
        tap(groups => groups.forEach(group => group.sessions.forEach(session => fixSessionDates(session))))
      ).subscribe({
        next: sessions => this.mapPlayerSessions(sessions),
        error: err => console.error('Failed to get bot sessions', err),
        complete: () => {
          this.lastSessionUpdate = Date.now();
          this.updatingSessions = false;
        }
      });
    } else {
      console.warn('Already looking up player sessions!');
    }
  }

  private mapPlayerSessions(groups: SessionGroup[]) {
    groups.forEach(group => group.sessions.forEach(session => {
      let tr: SessionTrace = this.data.find(
        (v: SessionTrace) => v._uuid === group.uuid && v._join === session.join.getTime());

      // if missing then add a new one
      if (tr == null) {
        tr = new SessionTrace(group.uuid, session.join.getTime());
        this.data.push(tr);
      }

      const join = session.join;
      const leave = session.leave == null ? new Date() : session.leave;

      // starting time
      tr.base[0] = (join.getTime());
      // length of the bar (relative to the base)
      tr.x[0] = (leave.getTime() - join.getTime());
      tr.y[0] = (group.username);

      let txt = `Joined: ${session.join.toLocaleString()}`;
      if (session.leave != null) {
        txt += `<br>Left: ${session.leave.toLocaleString()}`;
      }
      txt += `<br>Duration: ${moment(join).from(leave, true)}`;

      tr.text[0] = (txt);
    }));

    this.layoutTicks();
    this.revision++;
  }

  private lowerTimeBoundary(time?: any) {
    return (time == null ? moment() : moment(time)).subtract(1, 'day');
  }

  private layoutTicks() {
    const xaxis = this.layout.xaxis;
    const init = xaxis.range[1] === 0;

    let now, past;
    if (init) {
      now = moment();
      past = this.lowerTimeBoundary(now);
    } else {
      now = moment(xaxis.range[1]);
      past = moment(xaxis.range[0]);
    }

    const future = moment(now).add(1, 'hour');

    // by default the next tick is calculated for every hour
    let nextTick = current => moment(current).add(1, 'hour');

    // get the difference between the graphs min and max xaxis bounds
    const rangeDiff = moment(now).diff(past, 'seconds', true);
    // if the bounds is small enough, the ticks units will change to every 10 minutes instead of every hour
    if (rangeDiff > 0 && rangeDiff < 5 * 60 * 60) {
      nextTick = current => moment(current).add(10, 'minutes');
    }

    const values = [];
    const texts = [];

    // get the next hour
    let next = moment(past).startOf('hour');
    // show every hour until the current time
    while (next.valueOf() < future.valueOf()) {
      values.push(next.valueOf());
      texts.push(next.format('HH:mm'));
      next = nextTick(next);
    }

    // update the range
    if (init) {
      xaxis.range = [past.valueOf(), future.valueOf()];
    }

    // set the tick text
    this.layout.xaxis.tickvals = values;
    this.layout.xaxis.ticktext = texts;

    this.layout.uirevision++;
  }

  getStatusColor(status: PlayerStatus): string {
    switch (status.state) {
      case 'ONLINE':
        return 'text-success';
      case 'QUEUE':
        return 'text-primary';
      case 'OFFLINE':
        return 'text-danger';
    }
  }
}

interface PlayerStatusExt extends PlayerStatus {
  timeElapsed: string;
}

class SessionTrace {
  x = [0] as any[];
  y = [''] as string[];
  base = [0] as any[];
  text = [null] as string[];
  type = 'bar';
  orientation = 'h';
  hoverinfo = 'text';
  marker = {
    color: 'rgb(255,153,51)',
    width: 1
  };

  constructor(public _uuid: string, public _join: number) {
  }
}
