declare module 'redlock' {
  import { EventEmitter } from 'events';

  export interface Lock {
    resource: string;
    value: string;
    expiration: number;
    unlock(): Promise<void>;
  }

  export interface RedlockOptions {
    driftFactor?: number;
    retryCount?: number;
    retryDelay?: number;
    retryJitter?: number;
    automaticExtensionThreshold?: number;
  }

  export default class Redlock extends EventEmitter {
    constructor(clients: any[], options?: RedlockOptions);
    acquire(resources: string[], ttl: number): Promise<Lock>;
    lock(resources: string[], ttl: number): Promise<Lock>;
    release(lock: Lock): Promise<void>;
    quit(): Promise<void>;
  }
}