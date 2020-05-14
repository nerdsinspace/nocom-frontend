import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Note } from '../../models/note';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements INotificationService {
  private subject = new Subject<Note>();

  constructor() { }

  onNotify(id: string): Observable<Note> {
    return this.subject.asObservable().pipe(filter(v => v && v.id === id));
  }

  publish(note: Note): Note {
    this.subject.next(note);
    return note;
  }

  clear(id: string) {
    this.subject.next(new Note({id}));
  }

  createProxy(id: string) {
    return new NotificationServiceProxy(this, id) as INotificationService;
  }
}

export class NotificationServiceProxy implements INotificationService {
  constructor(private service: INotificationService, private id: string) {
  }

  onNotify(): Observable<Note> {
    return this.service.onNotify(this.id);
  }

  publish(note: Note): Note {
    note.id = this.id;
    return this.service.publish(note);
  }

  clear() {
    this.service.clear(this.id);
  }
}

export interface INotificationService {
  onNotify(id?: string);
  publish(note: Note): Note;
  clear(id?: string);
}
