import { interval1s } from '@riim/interval';

export const config: {
	maxRetries: number | undefined;
	timeout: number | undefined;
	timeoutAfterError: number | undefined;
	discardTimeoutedAttempts: boolean;
	onError: ((err: any, retryNumber: number) => number | void) | null;
	onTimeout: (() => void) | null;
	onRetry: ((err: any, leftRetries: number) => void) | null;
} = {
	maxRetries: 2,
	timeout: 0,
	timeoutAfterError: interval1s,
	discardTimeoutedAttempts: false,
	onError: null,
	onTimeout: null,
	onRetry: null
};

export type TOptions = Partial<typeof config>;

export function configure(options: TOptions) {
	Object.assign(config, options);

	return config;
}
