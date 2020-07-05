import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthenticationService } from '../../services/authentication/authentication.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionTracker } from '../../models/subscription-tracker';
import { User } from '../../models/user';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  username: string;
  password: string;

  errorMessage: string;

  private subs = new SubscriptionTracker();

  constructor(private auth: AuthenticationService, private router: Router) {
  }

  ngOnInit(): void {
    this.subs.track(this.auth.onLoginSuccess().subscribe(user => this.handleSuccess(user)));
    this.subs.track(this.auth.onLoginFailure().subscribe(err => this.handleError(err)));
  }

  ngOnDestroy(): void {
    this.subs.untrackAll();
  }

  login() {
    this.auth.login(this.username, this.password);
  }

  private handleSuccess(user: User) {
    this.errorMessage = null;
    this.router.navigateByUrl('/');
  }

  private handleError(err) {
    this.password = '';
    console.log('failure', err);

    let msg: string = 'Unknown authentication error';
    if (err == null) {
      return;
    } else if (typeof err === 'string') {
      msg = err;
    } else if (err instanceof HttpErrorResponse) {
      msg = JSON.parse(err.error).message;
    } else if (err instanceof Error) {
      msg = err.message;
    } else {
      console.log('Unknown error', err);
    }

    this.errorMessage = msg;
  }
}
