import { JsUtils } from './js-utils';
import { JwtHelperService } from '@auth0/angular-jwt';

const jwt = new JwtHelperService();

export class User {
  readonly username: string;
  readonly level: number;
  readonly expiresAt: Date;
  readonly accessToken: string;
  validated: boolean = false;

  constructor(o: Partial<User>, check: boolean = true) {
    Object.assign(this, o);

    if (check) {
      JsUtils.requireNotNull(this.username, 'username');
      JsUtils.requireNotNull(this.level, 'level');
      JsUtils.requireNotNull(this.expiresAt, 'expiresAt');
      JsUtils.requireNotNull(this.accessToken, 'accessToken');
    }
  }

  isTokenExpired(): boolean {
    return this.expiresAt == null || Date.now() > this.expiresAt.getTime();
  }

  public isRootAuthority(): boolean {
    return this.level >= 100;
  }

  public isAdminAuthority(): boolean {
    return this.level >= 90;
  }

  public isDevAuthority(): boolean {
    return this.level >= 50;
  }

  public isPrivileged(): boolean {
    return this.isDevAuthority();
  }

  static decode(token: string): User {
    JsUtils.requireNotNull(token, 'Token');
    const decoded = jwt.decodeToken(token);
    return new User({
      username: decoded.sub,
      level: decoded.lvl,
      expiresAt: jwt.getTokenExpirationDate(token),
      accessToken: token
    })
  }
}
