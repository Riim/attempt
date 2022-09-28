export declare const config: {
    maxRetries: number;
    timeout: number;
    timeoutAfterError: number;
    discardTimeoutedAttempts: boolean;
    onAttempt: ((attemptNumber: number) => number | void) | null;
    onError: ((err: any, retryNumber: number) => number | void) | null;
    onTimeout: (() => void) | null;
    onRetry: ((err: any, leftRetries: number) => void) | null;
};
export declare type TOptions = Partial<typeof config>;
export declare function configure(options: TOptions): {
    maxRetries: number;
    timeout: number;
    timeoutAfterError: number;
    discardTimeoutedAttempts: boolean;
    onAttempt: ((attemptNumber: number) => number | void) | null;
    onError: ((err: any, retryNumber: number) => number | void) | null;
    onTimeout: (() => void) | null;
    onRetry: ((err: any, leftRetries: number) => void) | null;
};
