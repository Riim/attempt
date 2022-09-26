import { delay } from '@riim/delay';
import { config, configure, TOptions } from './config';
import { AttemptTimeoutError } from './lib/AttemptTimeoutError';
import { identity } from './lib/identity';
import { noop } from './lib/noop';
import { throwIt } from './lib/throwIt';

export { AttemptTimeoutError };
export { TOptions, config, configure };

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

	let discardTimeoutedAttempts = options?.discardTimeoutedAttempts ?? config.discardTimeoutedAttempts;
	let onError = options?.onError ?? config.onError;
	let onTimeout = options?.onTimeout ?? config.onTimeout;
	let onRetry = options?.onRetry ?? config.onRetry;

	let ready = false;

	let onRejected = (
		err: any,
		leftRetries: number,
		retry: (err: any, leftRetries: number) => Promise<T>
	) => {
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

		ready = true;

		throw err;
	};

	if (timeout !== undefined && timeout != 0) {
		return (function attempt_(err: any, leftRetries): Promise<T> {
			let completed = false;
			let timeouted = false;

			if (onRetry && err !== null) {
				onRetry(err, leftRetries);
			}

			return Promise.race<T>([
				fn().then(
					(result) => {
						completed = true;

						if (timeouted && discardTimeoutedAttempts) {
							return ready ? null : new Promise(noop);
						}

						ready = true;

						return result;
					},
					(err) => {
						completed = true;

						if (timeouted) {
							return ready ? (null as any) : new Promise(noop);
						}

						return onRejected(err, leftRetries, attempt_).then(identity, throwIt);
					}
				),
				delay(timeout).then(() => {
					timeouted = true;

					if (completed) {
						return ready ? (null as any) : new Promise(noop);
					}

					return onRejected(new AttemptTimeoutError(), leftRetries, attempt_).then(
						identity,
						throwIt
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
