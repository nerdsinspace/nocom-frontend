export interface PlayerSession {
  username?: string;
  uuid?: string;
  join: Date;
  leave: Date;
}

export interface SessionGroup {
  username: string;
  uuid: string;
  sessions: PlayerSession[];
}

export function fixSessionDates(o: {join?: string | number | Date, leave?: string | number | Date}) {
  if(typeof o.join === 'string' || typeof o.join === 'number') {
    o.join = new Date(o.join);
  }
  if(typeof o.leave === 'string' || typeof o.leave === 'number') {
    o.leave = new Date(o.leave);
  }
}
