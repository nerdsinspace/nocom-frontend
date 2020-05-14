import { Component, OnDestroy, OnInit } from '@angular/core';
import { fixPlayerStatus, PlayerStatus } from '../../models/player-status';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { map, tap } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  statuses = [] as PlayerStatusExt[];
  private intervals = [];

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
    this.updateStatuses();
    this.intervals.push(setInterval(() => this.updateStatuses(), 2500));
  }

  ngOnDestroy(): void {
    while (this.intervals.length > 0) {
      clearInterval(this.intervals.pop());
    }
  }

  private updateStatuses() {
    this.http.get(`${environment.apiUrl}/api/bot-statuses`)
      .pipe(
        map(body => body as PlayerStatusExt[]),
        tap(_statuses => _statuses.forEach(s => {
          fixPlayerStatus(s);
          s.timeElapsed = this.getTimeDiff(s.updatedAt);
        }))
      ).subscribe({
      next: _statuses => {
        this.statuses = _statuses;
        this.statuses.sort((a, b) => a.playerUsername.localeCompare(b.playerUsername));
      },
      error: err => console.error('Failed to get bot statuses', err)
    });
  }

  private getTimeDiff(from: Date) {
    const diff = new Date(Date.now() - from.getTime());
    if (diff.getTime() > 5000) {
      const str = ((diff.getUTCHours() > 0 ? diff.getUTCHours() + 'h ' : '')
        + (diff.getUTCMinutes() > 0 ? diff.getUTCMinutes() + 'm ' : '')
        + (diff.getUTCSeconds() > 0 ? diff.getUTCSeconds() + 's' : '0s')).trim();
      return str + ' ago';
    } else {
      return 'now';
    }
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
