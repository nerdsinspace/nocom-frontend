import { Dimension, fixDimensionMember } from './dimension.enum';

export interface PlayerStatus {
  playerUsername: string;
  playerUuid: string;
  server: string;
  state: string;
  updatedAt: Date;
  data: string;
  dimension: Dimension;
}

export function fixPlayerStatus(o: {updatedAt: Date | string, dimension: Dimension | string}) {
  if (typeof o.updatedAt === 'string') {
    o.updatedAt = new Date(o.updatedAt);
  }
  fixDimensionMember(o);
}
