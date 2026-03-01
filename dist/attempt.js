Object.defineProperty(exports, Symbol.toStringTag, {
  value: 'Module'
});
var _riim_delay = require("@riim/delay");

//#region src/config.ts
var config = {
  maxRetries: 0,
  timeout: -1,
  timeoutAfterError: 0,
  discardTimeoutedAttempts: false,
  onAttempt: null,
  onError: null,
  onTimeout: null,
  onRetry: null
};
function configure(options) {
  Object.assign(config, options);
  return config;
}

//#endregion
//#region src/lib/AttemptTimeoutError.ts
var AttemptTimeoutError = class extends Error {};

//#endregion
//#region src/lib/endlessPromise.ts
var endlessPromise = new Promise(() => {});

//#endregion
//#region src/series.ts
function series(series, options) {
  var onAttempt = options?.onAttempt ?? config.onAttempt;
  var onError = options?.onError ?? config.onError;
  var idx = -1;
  return attempt(() => series[idx][0](), {
    ...options,
    maxRetries: series.length - 1,
    onAttempt: attemptNumber => {
      var timeout = onAttempt?.(attemptNumber);
      return series[++idx][1] ?? timeout;
    },
    onError: (err, retryNumber) => {
      var timeoutAfterError = onError?.(err, retryNumber);
      return series[idx][2] ?? timeoutAfterError;
    }
  });
}

//#endregion
//#region src/attempt.ts
function checkParam(name, value, minValue) {
  if (!Number.isInteger(value)) throw TypeError(`${name} must be integer`);
  if (value < minValue) throw TypeError(`${name} must be greater than or equal to ${minValue}`);
}
function checkTimeout(timeout) {
  checkParam("Timeout", timeout, -1);
}
function checkTimeoutAfterError(timeoutAfterError) {
  checkParam("TimeoutAfterError", timeoutAfterError, 0);
}
function attempt(fn, {
  maxRetries = config.maxRetries,
  timeout = config.timeout,
  timeoutAfterError = config.timeoutAfterError,
  discardTimeoutedAttempts = config.discardTimeoutedAttempts,
  onAttempt = config.onAttempt,
  onError = config.onError,
  onTimeout = config.onTimeout,
  onRetry = config.onRetry
} = config) {
  checkParam("MaxRetries", maxRetries, 0);
  checkTimeout(timeout);
  checkTimeoutAfterError(timeoutAfterError);
  var ready = false;
  var onRejected = (err, remainingRetries, retry) => {
    var timeoutAfterError_;
    if (err instanceof AttemptTimeoutError) {
      timeoutAfterError_ = 0;
      onTimeout?.();
    } else if (onError) {
      timeoutAfterError_ = onError(err, maxRetries - remainingRetries);
      if (timeoutAfterError_ === void 0) timeoutAfterError_ = timeoutAfterError;else checkTimeoutAfterError(timeoutAfterError_);
    } else timeoutAfterError_ = timeoutAfterError;
    if (remainingRetries != 0) {
      if (timeoutAfterError_ == 0) return retry(err, remainingRetries - 1);
      return (0, _riim_delay.delay)(timeoutAfterError_).then(() => ready || retry(err, remainingRetries - 1));
    }
    ready = true;
    throw err;
  };
  if (timeout == -1 && !onAttempt) return function tryIt(err, remainingRetries) {
    if (err !== null) onRetry?.(err, remainingRetries);
    return fn().catch(err => onRejected(err, remainingRetries, tryIt));
  }(null, maxRetries);
  return function tryIt(err, remainingRetries) {
    if (err !== null) onRetry?.(err, remainingRetries);
    var timeout_;
    if (onAttempt) {
      timeout_ = onAttempt(maxRetries - remainingRetries + 1);
      if (timeout_ === void 0) timeout_ = timeout;else checkTimeout(timeout_);
    } else timeout_ = timeout;
    var completed = false;
    var timeouted = false;
    var promise = fn().then(result => {
      if (ready) return;
      completed = true;
      if (timeouted && discardTimeoutedAttempts) return endlessPromise;
      ready = true;
      return result;
    }, err => {
      if (ready) return;
      completed = true;
      if (timeouted) return endlessPromise;
      return onRejected(err, remainingRetries, tryIt);
    });
    if (timeout_ == -1) return promise;
    return Promise.race([promise, (0, _riim_delay.delay)(timeout_).then(() => {
      if (ready) return;
      timeouted = true;
      if (completed) return endlessPromise;
      return onRejected(new AttemptTimeoutError(), remainingRetries, tryIt);
    })]);
  }(null, maxRetries);
}

//#endregion
exports.AttemptTimeoutError = AttemptTimeoutError;
exports.attempt = attempt;
exports.config = config;
exports.configure = configure;
exports.series = series;