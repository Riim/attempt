import { delay } from '@riim/delay';
import { TOptions, config, configure } from './config';
import { AttemptTimeoutError } from './lib/AttemptTimeoutError';
import { endlessPromise } from './lib/endlessPromise';

export { AttemptTimeoutError };
export { type TOptions, config, configure };
export { series } from './series';

function checkParam(name: string, value: number, minValue: number) {
	if (!Number.isInteger(value)) {
		throw TypeError(`${name} must be integer`);
	}
	if (value < minValue) {
		throw TypeError(`${name} must be greater than or equal to ${minValue}`);
	}
}

function checkTimeout(timeout: number) {
	checkParam('Timeout', timeout, -1);
}

function checkTimeoutAfterError(timeoutAfterError: number) {
	checkParam('TimeoutAfterError', timeoutAfterError, 0);
}

export function attempt<T>(
	fn: () => Promise<T>,
	{
		maxRetries = config.maxRetries,
		timeout = config.timeout,
		timeoutAfterError = config.timeoutAfterError,
		discardTimeoutedAttempts = config.discardTimeoutedAttempts,
		onAttempt = config.onAttempt,
		onError = config.onError,
		onTimeout = config.onTimeout,
		onRetry = config.onRetry
	}: TOptions = config
): Promise<T> {
	checkParam('MaxRetries', maxRetries, 0);
	checkTimeout(timeout);
	checkTimeoutAfterError(timeoutAfterError);

	let ready = false;

	let onRejected = (
		err: any,
		remainingRetries: number,
		retry: (err: any, remainingRetries: number) => Promise<T>
	) => {
		let timeoutAfterError_: number;

		if (err instanceof AttemptTimeoutError) {
			timeoutAfterError_ = 0;
			onTimeout?.();
		} else {
			if (onError) {
				timeoutAfterError_ = onError(err, maxRetries - remainingRetries)!;

				if (timeoutAfterError_ === undefined) {
					timeoutAfterError_ = timeoutAfterError;
				} else {
					checkTimeoutAfterError(timeoutAfterError_);
				}
			} else {
				timeoutAfterError_ = timeoutAfterError;
			}
		}

		if (remainingRetries != 0) {
			if (timeoutAfterError_ == 0) {
				return retry(err, remainingRetries - 1);
			}

			return delay(timeoutAfterError_).then<any>(() => ready || retry(err, remainingRetries - 1));
		}

		ready = true;

		throw err;
	};

	if (timeout == -1 && !onAttempt) {
		return (function tryIt(err: any, remainingRetries): Promise<T> {
			if (err !== null) {
				onRetry?.(err, remainingRetries);
			}

			return fn().catch((err) => onRejected(err, remainingRetries, tryIt));
		})(null, maxRetries);
	}

	return (function tryIt(err: any, remainingRetries): Promise<T> {
		if (err !== null) {
			onRetry?.(err, remainingRetries);
		}

		let timeout_: number;

		if (onAttempt) {
			timeout_ = onAttempt(maxRetries - remainingRetries + 1)!;

			if (timeout_ === undefined) {
				timeout_ = timeout;
			} else {
				checkTimeout(timeout_);
			}
		} else {
			timeout_ = timeout;
		}

		let completed = false;
		let timeouted = false;

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

				return onRejected(err, remainingRetries, tryIt);
			}
		);

		if (timeout_ == -1) {
			return promise;
		}

		return Promise.race<T>([
			promise,
			delay(timeout_).then(() => {
				if (ready) {
					return;
				}

				timeouted = true;

				if (completed) {
					return endlessPromise;
				}

				return onRejected(new AttemptTimeoutError(), remainingRetries, tryIt);
			})
		]);
	})(null, maxRetries);
}
