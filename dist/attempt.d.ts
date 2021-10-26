export declare class AttemptTimeoutError extends Error {
}
export declare const config: {
    maxRetries: number | undefined;
    timeout: number | undefined;
    timeoutAfterError: number | undefined;
    onError: ((err: any, retryNumber: number) => number | void) | null;
    onTimeout: (() => void) | null;
    onRetry: ((err: any, leftRetries: number) => void) | null;
    defaultValue: any;
};
export declare type TOptions = Partial<typeof config>;
export declare function configure(options: TOptions): {
    maxRetries: number | undefined;
    timeout: number | undefined;
    timeoutAfterError: number | undefined;
    onError: ((err: any, retryNumber: number) => number | void) | null;
    onTimeout: (() => void) | null;
    onRetry: ((err: any, leftRetries: number) => void) | null;
    defaultValue: any;
};
export declare function attempt<T>(fn: () => Promise<T>, options?: TOptions): Promise<T>;
