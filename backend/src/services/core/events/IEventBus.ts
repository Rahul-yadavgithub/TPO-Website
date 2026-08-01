export interface IEventBus {
  publish(eventName: string, payload: any): void;
  subscribe(eventName: string, handler: (payload: any) => void): void;
}
