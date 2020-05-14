import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { NotificationService } from '../../services/notification/notification.service';
import { Subscription } from 'rxjs';
import { Note, NoteType } from '../../models/note';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  @Input() id: string;
  @Input() fadeDelay = 3000;

  notes = [] as Note[];
  subscriptions = [] as Subscription[];

  constructor(private router: Router, private notificationService: NotificationService) {
  }

  ngOnInit(): void {
    this.subscriptions.push(this.notificationService.onNotify(this.id)
      .subscribe(n => {
        n.removeHandler = _n => this.removeNote(_n);
        this.notes.push(n);

        if (!n.persist) {
          setTimeout(() => n.remove(), this.fadeDelay);
        }
      }));

    this.subscriptions.push(this.router.events
      .subscribe(e => {
        if (e instanceof NavigationStart) {
          this.notificationService.clear(this.id);
        }
      }));
  }

  ngOnDestroy(): void {
    while (this.subscriptions.length > 0) {
      this.subscriptions.pop().unsubscribe();
    }
  }

  removeNote(note: Note) {
    if (this.notes.includes(note) && !note.fading) {
      note.fading = true;
      setTimeout(() => this.notes = this.notes.filter(n => n !== note), 250);
    }
  }

  generateCss(note: Note): string {
    const classes = ['alert', 'alert-dismissible'];

    switch (note.type) {
      case NoteType.ERROR:
        classes.push('alert-danger');
        break;
      case NoteType.INFO:
        classes.push('alert-info');
        break;
      case NoteType.SUCCESS:
        classes.push('alert-success');
        break;
      case NoteType.WARNING:
        classes.push('alert-warning');
    }

    if (note.fading) {
      classes.push('fade');
    }

    return classes.join(' ');
  }
}
