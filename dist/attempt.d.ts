import { config, configure, TOptions } from './config';
import { AttemptTimeoutError } from './lib/AttemptTimeoutError';
export { AttemptTimeoutError };
export { TOptions, config, configure };
export { series } from './series';
export declare function attempt<T>(fn: () => Promise<T>, options?: TOptions): Promise<T>;
