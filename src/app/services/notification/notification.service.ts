import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Note, NoteType } from '../../models/note';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private subject = new Subject<Note>();

  constructor() {
  }

  onNotify(id?: string): Observable<Note> {
    return this.subject.asObservable().pipe(filter(v => v && v.id === id));
  }

  publish(note: Note): Note {
    this.subject.next(note);
    return note;
  }

  publishType(note: Note | string | Partial<Note>, type: NoteType, persist: boolean = false): Note {
    const n = this.createNote(note);
    n.type = type;
    n.persist = persist;
    return this.publish(n);
  }

  publishInform(note: Note | string | Partial<Note>, persist: boolean = false): Note {
    return this.publishType(this.createNote(note), NoteType.INFO, persist);
  }

  publishError(note: Note | string | Partial<Note>, persist: boolean = false): Note {
    return this.publishType(this.createNote(note), NoteType.ERROR, persist);
  }

  publishWarning(note: Note | string | Partial<Note>, persist: boolean = false): Note {
    return this.publishType(this.createNote(note), NoteType.WARNING, persist);
  }

  publishSuccess(note: Note | string | Partial<Note>, persist: boolean = false): Note {
    return this.publishType(this.createNote(note), NoteType.SUCCESS, persist);
  }

  clear(id?: string) {
    this.subject.next(new Note({id}));
  }

  createProxy(id: string) {
    return new NotificationServiceProxy(this, id);
  }

  private createNote(note: Note | string | Partial<Note>): Note {
    if (note instanceof Note) {
      return note;
    } else if (typeof note === 'string') {
      return new Note({message: note});
    } else {
      return new Note(note);
    }
  }
}

class NotificationServiceProxy extends NotificationService {
  constructor(private service: NotificationService, private id: string) {
    super();
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

  createProxy(id: string): NotificationServiceProxy {
    return this;
  }
}
