import { EventEmitter } from 'events';
import { IEventBus } from './IEventBus';

export class EventEmitterBus implements IEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  publish(eventName: string, payload: any): void {
    // Fire asynchronously to avoid blocking the caller
    setImmediate(() => {
      this.emitter.emit(eventName, payload);
    });
  }

  subscribe(eventName: string, handler: (payload: any) => void): void {
    this.emitter.on(eventName, handler);
  }
}

// Singleton instance for global app usage
export const eventBus = new EventEmitterBus();
