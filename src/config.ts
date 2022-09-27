export const config: {
	maxRetries: number;
	timeout: number;
	timeoutAfterError: number;
	discardTimeoutedAttempts: boolean;
	onAttempt: ((attemptNumber: number) => number | void) | null;
	onError: ((err: any, retryNumber: number) => number | void) | null;
	onTimeout: (() => void) | null;
	onRetry: ((err: any, leftRetries: number) => void) | null;
} = {
	maxRetries: 0,
	timeout: -1,
	timeoutAfterError: 0,
	discardTimeoutedAttempts: false,
	onAttempt: null,
	onError: null,
	onTimeout: null,
	onRetry: null
};

export type TOptions = Partial<typeof config>;

export function configure(options: TOptions) {
	Object.assign(config, options);

	return config;
}
