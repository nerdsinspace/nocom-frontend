export class Note {
  id: string;
  message: string;
  type: NoteType;
  persist: boolean;
  fading: boolean;
  removeHandler: RemoveHandler;

  constructor(init?: Partial<Note>) {
    Object.assign(this, init);
  }

  remove(delayMs?: number) {
    if (this.removeHandler != null) {
      if (delayMs == null) {
        this.removeHandler(this);
      } else {
        setInterval(() => this.remove(), delayMs);
      }
    }
  }
}

type RemoveHandler = (note: Note) => void;

export enum NoteType {
  SUCCESS,
  ERROR,
  INFO,
  WARNING
}
