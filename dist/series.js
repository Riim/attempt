"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.series = void 0;
const attempt_1 = require("./attempt");
const config_1 = require("./config");
function series(series, options) {
    var _a, _b;
    let onAttempt = (_a = options === null || options === void 0 ? void 0 : options.onAttempt) !== null && _a !== void 0 ? _a : config_1.config.onAttempt;
    let onError = (_b = options === null || options === void 0 ? void 0 : options.onError) !== null && _b !== void 0 ? _b : config_1.config.onError;
    let idx = -1;
    return (0, attempt_1.attempt)(() => series[idx][0](), Object.assign(Object.assign({}, options), { maxRetries: series.length - 1, onAttempt: (attemptNumber) => {
            var _a;
            let timeout = onAttempt === null || onAttempt === void 0 ? void 0 : onAttempt(attemptNumber);
            return (_a = series[++idx][1]) !== null && _a !== void 0 ? _a : timeout;
        }, onError: (err, retryNumber) => {
            var _a;
            let timeoutAfterError = onError === null || onError === void 0 ? void 0 : onError(err, retryNumber);
            return (_a = series[idx][2]) !== null && _a !== void 0 ? _a : timeoutAfterError;
        } }));
}
exports.series = series;
