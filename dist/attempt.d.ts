import { TOptions, config, configure } from './config';
import { AttemptTimeoutError } from './lib/AttemptTimeoutError';
export { AttemptTimeoutError };
export { type TOptions, config, configure };
export { series } from './series';
export declare function attempt<T>(fn: () => Promise<T>, { maxRetries, timeout, timeoutAfterError, discardTimeoutedAttempts, onAttempt, onError, onTimeout, onRetry }?: TOptions): Promise<T>;
