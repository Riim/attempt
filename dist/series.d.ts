import { TOptions } from './config';
export declare function series<T>(series: Array<[fn: () => Promise<T>, timeout?: number, timeoutAfterError?: number]>, options?: Omit<TOptions, 'maxRetries'>): Promise<T>;
