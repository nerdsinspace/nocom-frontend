import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { filter, map, tap, throwIfEmpty } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { User } from '../../models/user';
import { Observable, Subject } from 'rxjs';
import { JsUtils } from '../../models/js-utils';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private authenticatedUser: User;
  private validated = false;

  readonly subject = new Subject<User | any>();

  constructor(private http: HttpClient, private router: Router) {
    this.onLoginSuccess().subscribe(user => {
      const expiration = user.expiresAt.getTime() - Date.now();
      setTimeout(() => this.logout('Token expired'), expiration + 1000);
    });

    this.onLoginFailure().subscribe(err => router.navigateByUrl('/login'));

    this.loadSession();

    if (this.user == null) {
      this.setUser(null, null, false);
    }
  }

  login(user: string, pass: string) {
    return this.http.post(`${environment.apiUrl}/login`, {}, {
      params: {
        username: user,
        password: pass
      },
      responseType: 'text'
    }).pipe(
      map(token => this.parseToken(token as string)),
      filter(user => user != null),
      tap(user => user.validated = true),
      throwIfEmpty(() => new Error('Failed to parse access token!'))
    );
  }

  logout(reason: string = 'Logged out') {
    this.setUser(null, new Error(reason));
  }

  loadSession(debug: boolean = true): boolean {
    if (this.user != null) {
      if (debug) {
        console.warn('Loading token from storage despite having non-null user');
      }
      return true;
    }

    // load the authenticated user
    const token = localStorage.getItem('JWT_TOKEN');
    if (token == null) {
      // console.debug('No existing authentication token exists (this is fine)');
      return false;
    }

    // decode the stored jwt token and check if it is valid
    const user = this.parseToken(token);
    if (user == null) {
      // parseToken will print its own warning message
      return false;
    } else if (user.isTokenExpired()) {
      console.warn('Token has expired');
      return false;
    }

    // this will fire async
    if (!this.validated) {
      this.validated = true;
      this.http.post(`${environment.apiUrl}/validate`, {}, {
        headers: new HttpHeaders({
          Authorization: this.getHeaderToken()
        })
      }).subscribe({
        next: () => this.user.validated = true,
        error: () => this.logout()
      });
    }

    return true;
  }

  get user(): User {
    return this.authenticatedUser;
  }

  isPrivileged(): boolean {
    return this.user != null && this.user.isPrivileged();
  }

  isAuthorized(): boolean {
    return this.user != null && !this.user.isTokenExpired();
  }

  isFullyAuthorized(): boolean {
    return this.isAuthorized() && this.user.validated;
  }

  onLoginSuccess(): Observable<User> {
    return this.subject.pipe(
      filter(v => v instanceof User),
      map(v => v as User)
    );
  }

  onLoginFailure(): Observable<any> {
    return this.subject.pipe(filter(v => !(v instanceof User)));
  }

  getHeaderToken(): string {
    return 'Bearer ' + this.user.accessToken;
  }

  private setUser(user: User, error?: any, check: boolean = true) {
    if (check && this.user == user) {
      return;
    } else if (user != null) {
      this.authenticatedUser = user;
      this.saveSession();

      this.subject.next(this.user);
    } else {
      this.authenticatedUser = null;
      this.deleteSession();

      this.subject.next(error);
    }
  }

  private parseToken(token: string): User {
    try {
      JsUtils.requireNotNull(token, 'token');
      this.setUser(User.decode(token));
    } catch (e) {
      console.error('Failed to parse token', e);

      if (this.user != null) {
        this.setUser(null, e);
      }
    }

    return this.user;
  }

  private saveSession() {
    localStorage.setItem('JWT_TOKEN', this.user.accessToken);
  }

  private deleteSession() {
    localStorage.removeItem('JWT_TOKEN');
  }

  // public register(user: string, pass: string, lvl: number) {
  //   return this.http.post(`${environment.apiUrl}/user/register`, {}, {
  //     params: {
  //       username: user,
  //       password: pass,
  //       level: lvl.toString()
  //     }
  //   });
  // }
  //
  // public unregister(user: string) {
  //   return this.http.get(`${environment.apiUrl}/user/unregister/${user}`);
  // }
  //
  // public getUsernames() {
  //   return this.http.get(`${environment.apiUrl}/user/registered`);
  // }
  //
  // public setPassword(user: string, pass: string) {
  //   return this.http.post(`${environment.apiUrl}/user/set/password/${user}`, null, {
  //     params: {
  //       password: pass
  //     }
  //   });
  // }
  //
  // public setEnabled(user: string, enable: boolean) {
  //   return this.http.post(`${environment.apiUrl}/user/set/enabled/${user}`, null, {
  //     params: {
  //       enabled: enable ? 'true' : 'false',
  //     }
  //   });
  // }
  //
  // public setLevel(user: string, lvl: number) {
  //   return this.http.post(`${environment.apiUrl}/user/set/level/${user}`, null, {
  //     params: {
  //       level: lvl.toString(),
  //     }
  //   });
  // }
}
