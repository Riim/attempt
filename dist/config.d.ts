export declare const config: {
    maxRetries: number | undefined;
    timeout: number | undefined;
    timeoutAfterError: number | undefined;
    discardTimeoutedAttempts: boolean;
    onError: ((err: any, retryNumber: number) => number | void) | null;
    onTimeout: (() => void) | null;
    onRetry: ((err: any, leftRetries: number) => void) | null;
};
export declare type TOptions = Partial<typeof config>;
export declare function configure(options: TOptions): {
    maxRetries: number | undefined;
    timeout: number | undefined;
    timeoutAfterError: number | undefined;
    discardTimeoutedAttempts: boolean;
    onError: ((err: any, retryNumber: number) => number | void) | null;
    onTimeout: (() => void) | null;
    onRetry: ((err: any, leftRetries: number) => void) | null;
};
