import { attempt } from './attempt';
import { config, TOptions } from './config';

export function series<T>(
	series: Array<[fn: () => Promise<T>, timeout?: number, timeoutAfterError?: number]>,
	options?: Omit<TOptions, 'maxRetries'>
): Promise<T> {
	let onAttempt = options?.onAttempt ?? config.onAttempt;
	let onError = options?.onError ?? config.onError;

	let idx = -1;

	return attempt(() => series[idx][0](), {
		...options,
		maxRetries: series.length - 1,
		onAttempt: (attemptNumber) => {
			let timeout = onAttempt?.(attemptNumber);

			return series[++idx][1] ?? timeout;
		},
		onError: (err, retryNumber) => {
			let timeoutAfterError = onError?.(err, retryNumber);

			return series[idx][2] ?? timeoutAfterError;
		}
	});
}
