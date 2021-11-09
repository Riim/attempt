import { delay } from '@riim/delay';
import { interval15s, interval1s, interval30s } from '@riim/interval';

export class AttemptTimeoutError extends Error {}

export const config: {
	maxRetries: number | undefined;
	timeout: number | undefined;
	timeoutAfterError: number | undefined;
	onError: ((err: any, retryNumber: number) => number | void) | null;
	onTimeout: (() => void) | null;
	onRetry: ((err: any, leftRetries: number) => void) | null;
	defaultValue: any;
} = {
	maxRetries: 2,
	timeout: interval15s,
	timeoutAfterError: interval1s,
	onError: null,
	onTimeout: null,
	onRetry: null,
	defaultValue: undefined
};

export type TOptions = Partial<typeof config>;

export function configure(options: TOptions) {
	Object.assign(config, options);
	return config;
}

const checkTimeoutAfterError = (timeoutAfterError: number) => {
	if (!Number.isInteger(timeoutAfterError)) {
		throw TypeError('Timeout before retry must be integer');
	}

	if (timeoutAfterError < 0) {
		throw TypeError('Timeout before retry must be greater than or equal to zero');
	}
};

export function attempt<T>(fn: () => Promise<T>, options?: TOptions): Promise<T> {
	let maxRetries = options?.maxRetries ?? config.maxRetries;

	if (!Number.isInteger(maxRetries)) {
		throw TypeError('Maximum number of retries must be integer');
	}

	if (maxRetries! < 0) {
		throw TypeError('Maximum number of retries must be greater than or equal to zero');
	}

	let timeout = options?.timeout ?? config.timeout;

	if (timeout !== undefined) {
		if (!Number.isInteger(timeout)) {
			throw TypeError('Timeout of attempt must be integer');
		}

		if (timeout < 0) {
			throw TypeError('Timeout of attempt must be greater than or equal to zero');
		}
	}

	let timeoutAfterError = options?.timeoutAfterError ?? config.timeoutAfterError;

	if (timeoutAfterError !== undefined) {
		checkTimeoutAfterError(timeoutAfterError);
	}

	let onError = options?.onError ?? config.onError;
	let onTimeout = options?.onTimeout ?? config.onTimeout;
	let onRetry = options?.onRetry ?? config.onRetry;

	let onRejected = (err: any, leftRetries: number, retry: (err: any, leftRetries: number) => Promise<T>) => {
		if (err instanceof AttemptTimeoutError) {
			if (onTimeout) {
				onTimeout();
			}
		} else {
			if (onError) {
				let timeoutAfterError_ = onError(err, maxRetries! - leftRetries);

				if (timeoutAfterError_ !== undefined) {
					checkTimeoutAfterError(timeoutAfterError_);
					timeoutAfterError = timeoutAfterError_;
				}
			}
		}

		if (leftRetries != 0) {
			return timeoutAfterError !== undefined && timeoutAfterError != 0
				? delay(timeoutAfterError).then(() => retry(err, leftRetries - 1))
				: retry(err, leftRetries - 1);
		}

		if (options?.defaultValue !== undefined || config.defaultValue !== undefined) {
			return Promise.resolve(options?.defaultValue !== undefined ? options.defaultValue : config.defaultValue);
		}

		throw err;
	};

	if (timeout !== undefined && timeout != 0) {
		return (function attempt_(err: any, leftRetries): Promise<T> {
			let loaded = false;
			let timeouted = false;
			let ready = false;

			if (onRetry && err !== null) {
				onRetry(err, leftRetries);
			}

			return Promise.race([
				fn().then(
					(result) => {
						loaded = true;
						ready = true;

						return result;
					},
					(err) => {
						loaded = true;

						if (timeouted) {
							return (
								ready ||
								(function _(): any {
									return delay(interval30s).then(() => ready || _());
								})()
							);
						}

						return onRejected(err, leftRetries, attempt_).then(
							(result: T) => {
								ready = true;

								return result;
							},
							(err: any) => {
								ready = true;

								throw err;
							}
						);
					}
				),
				delay(timeout).then(() => {
					timeouted = true;

					if (loaded) {
						return (
							ready ||
							(function _(): any {
								return delay(interval30s).then(() => ready || _());
							})()
						);
					}

					return onRejected(new AttemptTimeoutError(), leftRetries, attempt_).then(
						(result: T) => {
							ready = true;

							return result;
						},
						(err: any) => {
							ready = true;

							throw err;
						}
					);
				})
			]);
		})(null, maxRetries!);
	} else {
		return (function attempt_(err: any, leftRetries): Promise<T> {
			if (onRetry && err !== null) {
				onRetry(err, leftRetries);
			}

			return fn().catch((err) => onRejected(err, leftRetries, attempt_));
		})(null, maxRetries!);
	}
}
