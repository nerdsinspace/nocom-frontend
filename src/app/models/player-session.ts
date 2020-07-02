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
