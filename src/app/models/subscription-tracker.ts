import { Subscription } from 'rxjs';

export class SubscriptionTracker {
  private subscriptions = [] as Subscription[];

  track(subscription: Subscription): Subscription {
    this.subscriptions.push(subscription);
    return subscription;
  }

  untrackAll() {
    while (this.subscriptions.length > 0) {
      this.subscriptions.pop().unsubscribe();
    }
  }
}
