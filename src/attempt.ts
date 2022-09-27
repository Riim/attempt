import { delay } from '@riim/delay';
import { config, configure, TOptions } from './config';
import { AttemptTimeoutError } from './lib/AttemptTimeoutError';
import { endlessPromise } from './lib/endlessPromise';
import { identity } from './lib/identity';
import { throwIt } from './lib/throwIt';

export { AttemptTimeoutError };
export { TOptions, config, configure };
export { series } from './series';

const checkTimeoutAfterError = (timeoutAfterError: number) => {
	if (!Number.isInteger(timeoutAfterError)) {
		throw TypeError('Timeout after error must be integer');
	}

	if (timeoutAfterError < 0) {
		throw TypeError('Timeout after error must be greater than or equal to 0');
	}
};

const checkTimeout = (timeout: number) => {
	if (!Number.isInteger(timeout)) {
		throw TypeError('Timeout of attempt must be integer');
	}

	if (timeout < -1) {
		throw TypeError('Timeout of attempt must be greater than or equal to -1');
	}
};

export function attempt<T>(fn: () => Promise<T>, options?: TOptions): Promise<T> {
	let maxRetries = options?.maxRetries ?? config.maxRetries;

	if (!Number.isInteger(maxRetries)) {
		throw TypeError('Maximum number of retries must be integer');
	}

	if (maxRetries < 0) {
		throw TypeError('Maximum number of retries must be greater than or equal to 0');
	}

	let timeout = options?.timeout ?? config.timeout;

	if (timeout !== undefined) {
		checkTimeout(timeout);
	}

	let timeoutAfterError = options?.timeoutAfterError ?? config.timeoutAfterError;

	if (timeoutAfterError !== undefined) {
		checkTimeoutAfterError(timeoutAfterError);
	}

	let discardTimeoutedAttempts =
		options?.discardTimeoutedAttempts ?? config.discardTimeoutedAttempts;
	let onAttempt = options?.onAttempt ?? config.onAttempt;
	let onError = options?.onError ?? config.onError;
	let onTimeout = options?.onTimeout ?? config.onTimeout;
	let onRetry = options?.onRetry ?? config.onRetry;

	let ready = false;

	let onRejected = (
		err: any,
		leftRetries: number,
		retry: (err: any, leftRetries: number) => Promise<T>
	) => {
		let timeoutAfterError_ = timeoutAfterError;

		if (err instanceof AttemptTimeoutError) {
			if (onTimeout) {
				onTimeout();
			}
		} else {
			if (onError) {
				timeoutAfterError_ = onError(err, maxRetries - leftRetries)!;

				if (timeoutAfterError_ === undefined) {
					timeoutAfterError_ = timeoutAfterError;
				} else {
					checkTimeoutAfterError(timeoutAfterError_);
				}
			}
		}

		if (leftRetries != 0) {
			return timeoutAfterError_ != 0
				? delay(timeoutAfterError_).then<any>(() =>
						ready ? undefined : retry(err, leftRetries - 1)
				  )
				: retry(err, leftRetries - 1);
		}

		ready = true;

		throw err;
	};

	if (timeout == -1 && !onAttempt) {
		return (function tryIt(err: any, leftRetries): Promise<T> {
			if (onRetry && err !== null) {
				onRetry(err, leftRetries);
			}

			return fn().catch((err) => onRejected(err, leftRetries, tryIt));
		})(null, maxRetries);
	}

	return (function tryIt(err: any, leftRetries): Promise<T> {
		let completed = false;
		let timeouted = false;

		if (onRetry && err !== null) {
			onRetry(err, leftRetries);
		}

		let timeout_: number;

		if (onAttempt) {
			timeout_ = onAttempt(maxRetries - leftRetries + 1)!;

			if (timeout_ === undefined) {
				timeout_ = timeout;
			} else {
				checkTimeout(timeout_);
			}
		} else {
			timeout_ = timeout;
		}

		let promise = fn().then(
			(result) => {
				if (ready) {
					return;
				}

				completed = true;

				if (timeouted && discardTimeoutedAttempts) {
					return endlessPromise;
				}

				ready = true;

				return result;
			},
			(err) => {
				if (ready) {
					return;
				}

				completed = true;

				if (timeouted) {
					return endlessPromise;
				}

				return onRejected(err, leftRetries, tryIt).then(identity, throwIt);
			}
		);

		return timeout_ == -1
			? promise
			: Promise.race<T>([
					promise,
					delay(timeout_).then(() => {
						if (ready) {
							return;
						}

						timeouted = true;

						if (completed) {
							return endlessPromise;
						}

						return onRejected(new AttemptTimeoutError(), leftRetries, tryIt).then(
							identity,
							throwIt
						);
					})
			  ]);
	})(null, maxRetries);
}
