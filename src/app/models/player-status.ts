import { Dimension } from './dimension.enum';

export interface PlayerStatus {
  playerUsername: string;
  playerUuid: string;
  server: string;
  state: string;
  updatedAt: Date;
  data: string;
  dimension: Dimension;
  _lastUpdate: Date;
}
