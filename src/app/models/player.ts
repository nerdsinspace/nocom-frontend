export interface Player {
  username: string;
  uuid: string;
  strength?: number;
  online?: boolean;
  join?: Date;
  leave?: Date;
}
