import { delay } from '@riim/delay';
import { interval15s, interval1s, interval30s } from '@riim/interval';

export class AttemptTimeoutError extends Error {}

export const config: {
	maxRetries: number | undefined;
	maxTimeout: number | undefined;
	timeoutBeforeRetry: number | undefined;
	onError: ((err: any, retryNumber: number) => number | void) | null;
	onTimeout: (() => void) | null;
	onRetry: ((err: any, leftRetries: number) => void) | null;
	defaultValue: any;
} = {
	maxRetries: 2,
	maxTimeout: interval15s,
	timeoutBeforeRetry: interval1s,
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

const checkTimeoutBeforeRetry = (timeoutBeforeRetry: number) => {
	if (!Number.isInteger(timeoutBeforeRetry)) {
		throw TypeError('Timeout before retry must be integer');
	}

	if (timeoutBeforeRetry < 0) {
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

	let maxTimeout = options?.maxTimeout ?? config.maxTimeout;

	if (maxTimeout !== undefined) {
		if (!Number.isInteger(maxTimeout)) {
			throw TypeError('Max timeout of attempt must be integer');
		}

		if (maxTimeout <= 0) {
			throw TypeError('Max timeout of attempt must be greater than zero');
		}
	}

	let timeoutBeforeRetry = options?.timeoutBeforeRetry ?? config.timeoutBeforeRetry;

	if (timeoutBeforeRetry !== undefined) {
		checkTimeoutBeforeRetry(timeoutBeforeRetry);
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
				let timeoutBeforeRetry_ = onError(err, maxRetries! - leftRetries);

				if (timeoutBeforeRetry_ !== undefined) {
					checkTimeoutBeforeRetry(timeoutBeforeRetry_);
					timeoutBeforeRetry = timeoutBeforeRetry_;
				}
			}
		}

		if (leftRetries != 0) {
			return timeoutBeforeRetry !== undefined && timeoutBeforeRetry != 0
				? delay(timeoutBeforeRetry).then(() => retry(err, leftRetries - 1))
				: retry(err, leftRetries - 1);
		}

		if (options?.defaultValue !== undefined) {
			return options.defaultValue;
		} else if (config.defaultValue !== undefined) {
			return config.defaultValue;
		}

		throw err;
	};

	if (maxTimeout !== undefined && maxTimeout != 0) {
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
				delay(maxTimeout).then(() => {
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
