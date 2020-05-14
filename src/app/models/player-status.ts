export interface PlayerStatus {
  playerUsername: string;
  playerUuid: string;
  server: string;
  state: string;
  updatedAt: Date;
  data: string;
}

export function fixPlayerStatus(o: {updatedAt: Date | string}) {
  if (typeof o.updatedAt === 'string') {
    o.updatedAt = new Date(o.updatedAt);
  }
}
