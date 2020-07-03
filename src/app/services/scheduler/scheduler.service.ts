import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  private refs = [];

  constructor() {
  }

  repeating(callback: (...args: any[]) => void, ms: number, ...args: any[]) {
    const i = setInterval(callback, ms, ...args);
    this.refs.push({id: i, type: 0});
    return i;
  }

  once(callback: (...args: any[]) => void, ms: number, ...args: any[]) {
    const i = setTimeout(callback, ms, ...args);
    this.refs.push({id: i, type: 1});
    return i;
  }

  clear(id: any): void {
    const ref = this.refs.find(v => v.id === id);
    if (ref != null) {
      this.remove(ref);
    }
    console.warn('Unknown id', id);
  }

  clearAll(): void {
    while (this.refs.length > 0) {
      this.remove(this.refs.pop());
    }
  }

  private remove(ref: any) {
    switch (ref.type) {
      case 0:
        return clearInterval(ref.id);
      case 1:
        return clearTimeout(ref.id);
    }
    console.error(`Bad type '${ref.type}' for type ${ref.id}`);
  }
}
