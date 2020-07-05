import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { filter, map, throwIfEmpty } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { User } from '../../models/user';
import { Observable, Subject } from 'rxjs';
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
  }

  login(user: string, pass: string): void {
    this.http.post(`${environment.apiUrl}/login`, {}, {
      params: {
        username: user,
        password: pass
      },
      responseType: 'text'
    }).pipe(
      map(token => User.decode(token as string)),
      filter(user => user != null),
      throwIfEmpty(() => new Error('Failed to parse access token!'))
    ).subscribe({
      next: user => {
        user.validated = true;
        this.setUser(user);
      },
      error: err => this.logout(err)
    });
  }

  logout(reason: string = 'Logged out') {
    this.setUser(null, new Error(reason));
  }

  loadSession() {
    // load the authenticated user
    const token = localStorage.getItem('JWT_TOKEN');
    if (token != null) {
      // console.debug('No existing authentication token exists (this is fine)');

      // decode the stored jwt token and check if it is valid
      try {
        const user = User.decode(token);

        if (user.isTokenExpired()) {
          return this.logout('Token expired');
        }

        if (!this.validated) {
          this.validated = true;
          this.http.post(`${environment.apiUrl}/validate`, {}, {
            headers: new HttpHeaders({
              Authorization: this.getHeaderToken()
            })
          }).subscribe({
            next: () => this.user.validated = true,
            error: err => this.logout(err)
          });
        }
        return this.setUser(user);
      } catch (e) {
        return this.logout(e);
      }
    }

    // call listeners
    this.logout();
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

  private setUser(user: User, error?: any) {
    if (user != null) {
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
    return User.decode(token);
    //
    // try {
    //   JsUtils.requireNotNull(token, 'token');
    //   this.setUser(User.decode(token));
    // } catch (e) {
    //   console.error('Failed to parse token', e);
    //
    //   if (this.user != null) {
    //     this.setUser(null, e);
    //   }
    // }
    //
    // return this.user;
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
