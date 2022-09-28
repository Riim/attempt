"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attempt = exports.series = exports.configure = exports.config = exports.AttemptTimeoutError = void 0;
const delay_1 = require("@riim/delay");
const config_1 = require("./config");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return config_1.config; } });
Object.defineProperty(exports, "configure", { enumerable: true, get: function () { return config_1.configure; } });
const AttemptTimeoutError_1 = require("./lib/AttemptTimeoutError");
Object.defineProperty(exports, "AttemptTimeoutError", { enumerable: true, get: function () { return AttemptTimeoutError_1.AttemptTimeoutError; } });
const endlessPromise_1 = require("./lib/endlessPromise");
const identity_1 = require("./lib/identity");
const throwIt_1 = require("./lib/throwIt");
var series_1 = require("./series");
Object.defineProperty(exports, "series", { enumerable: true, get: function () { return series_1.series; } });
const checkTimeoutAfterError = (timeoutAfterError) => {
    if (!Number.isInteger(timeoutAfterError)) {
        throw TypeError('Timeout after error must be integer');
    }
    if (timeoutAfterError < 0) {
        throw TypeError('Timeout after error must be greater than or equal to 0');
    }
};
const checkTimeout = (timeout) => {
    if (!Number.isInteger(timeout)) {
        throw TypeError('Timeout of attempt must be integer');
    }
    if (timeout < -1) {
        throw TypeError('Timeout of attempt must be greater than or equal to -1');
    }
};
function attempt(fn, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let maxRetries = (_a = options === null || options === void 0 ? void 0 : options.maxRetries) !== null && _a !== void 0 ? _a : config_1.config.maxRetries;
    if (!Number.isInteger(maxRetries)) {
        throw TypeError('Maximum number of retries must be integer');
    }
    if (maxRetries < 0) {
        throw TypeError('Maximum number of retries must be greater than or equal to 0');
    }
    let timeout = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : config_1.config.timeout;
    if (timeout !== undefined) {
        checkTimeout(timeout);
    }
    let timeoutAfterError = (_c = options === null || options === void 0 ? void 0 : options.timeoutAfterError) !== null && _c !== void 0 ? _c : config_1.config.timeoutAfterError;
    if (timeoutAfterError !== undefined) {
        checkTimeoutAfterError(timeoutAfterError);
    }
    let discardTimeoutedAttempts = (_d = options === null || options === void 0 ? void 0 : options.discardTimeoutedAttempts) !== null && _d !== void 0 ? _d : config_1.config.discardTimeoutedAttempts;
    let onAttempt = (_e = options === null || options === void 0 ? void 0 : options.onAttempt) !== null && _e !== void 0 ? _e : config_1.config.onAttempt;
    let onError = (_f = options === null || options === void 0 ? void 0 : options.onError) !== null && _f !== void 0 ? _f : config_1.config.onError;
    let onTimeout = (_g = options === null || options === void 0 ? void 0 : options.onTimeout) !== null && _g !== void 0 ? _g : config_1.config.onTimeout;
    let onRetry = (_h = options === null || options === void 0 ? void 0 : options.onRetry) !== null && _h !== void 0 ? _h : config_1.config.onRetry;
    let ready = false;
    let onRejected = (err, leftRetries, retry) => {
        let timeoutAfterError_ = timeoutAfterError;
        if (err instanceof AttemptTimeoutError_1.AttemptTimeoutError) {
            if (onTimeout) {
                onTimeout();
            }
        }
        else {
            if (onError) {
                timeoutAfterError_ = onError(err, maxRetries - leftRetries);
                if (timeoutAfterError_ === undefined) {
                    timeoutAfterError_ = timeoutAfterError;
                }
                else {
                    checkTimeoutAfterError(timeoutAfterError_);
                }
            }
        }
        if (leftRetries != 0) {
            return timeoutAfterError_ != 0
                ? (0, delay_1.delay)(timeoutAfterError_).then(() => ready ? undefined : retry(err, leftRetries - 1))
                : retry(err, leftRetries - 1);
        }
        ready = true;
        throw err;
    };
    if (timeout == -1 && !onAttempt) {
        return (function tryIt(err, leftRetries) {
            if (onRetry && err !== null) {
                onRetry(err, leftRetries);
            }
            return fn().catch((err) => onRejected(err, leftRetries, tryIt));
        })(null, maxRetries);
    }
    return (function tryIt(err, leftRetries) {
        let completed = false;
        let timeouted = false;
        if (onRetry && err !== null) {
            onRetry(err, leftRetries);
        }
        let timeout_;
        if (onAttempt) {
            timeout_ = onAttempt(maxRetries - leftRetries + 1);
            if (timeout_ === undefined) {
                timeout_ = timeout;
            }
            else {
                checkTimeout(timeout_);
            }
        }
        else {
            timeout_ = timeout;
        }
        let promise = fn().then((result) => {
            if (ready) {
                return;
            }
            completed = true;
            if (timeouted && discardTimeoutedAttempts) {
                return endlessPromise_1.endlessPromise;
            }
            ready = true;
            return result;
        }, (err) => {
            if (ready) {
                return;
            }
            completed = true;
            if (timeouted) {
                return endlessPromise_1.endlessPromise;
            }
            return onRejected(err, leftRetries, tryIt).then(identity_1.identity, throwIt_1.throwIt);
        });
        return timeout_ == -1
            ? promise
            : Promise.race([
                promise,
                (0, delay_1.delay)(timeout_).then(() => {
                    if (ready) {
                        return;
                    }
                    timeouted = true;
                    if (completed) {
                        return endlessPromise_1.endlessPromise;
                    }
                    return onRejected(new AttemptTimeoutError_1.AttemptTimeoutError(), leftRetries, tryIt).then(identity_1.identity, throwIt_1.throwIt);
                })
            ]);
    })(null, maxRetries);
}
exports.attempt = attempt;
