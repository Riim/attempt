# Attempt

## Installation

```
npm install @riim/attempt --save
```

## Example

```js
import { attempt } from '@riim/attempt';
import { duration } from '@riim/duration';

await attempt(
	() => client.getAuth(),
	{
		maxRetries: 10,
		timeout: duration.s10,
		timeoutAfterError: duration.s1,
		onError: (err) => {
			console.error('Error', err.message);
		},
		onTimeout: () => {
			console.error('Timeout');
		},
		onRetry: (err, leftRetries) => {
			console.warn('!!! RETRY', leftRetries);
		}
	}
);
```

## Options

- `maxRetries` - максимальное количество повторов. При этом первая попытка повтором не является, то есть если указано 2, то может быть до 3-х попыток из которых 2 будут повторами. По умолчанию - 0.
- `timeout` -  Ограничение по времени попытки в миллисекундах. Можно установить в 0 - нет ограничения. По умолчанию - 0.
- `timeoutAfterError` - Дополнительная задержка перед повтором после ошибки. Дополнительной задержки нет если повтор происходит из-за прерывания попытки по таймауту. Можно установить в 0. По умолчанию - 0.
- `onError` - Обработчик ошибки. Первый аргумент - ошибка, второй - номер повтора. При первом срабатывании номер повтора будет 0 (первая попытка - не повтор). Может возвращать число миллисекунд до повтора переопределяя `timeoutAfterError`. Таким образом можно гибко управлять стратегией изменения `timeoutAfterError`:
```js
import { attempt } from '@riim/attempt';
import { duration } from '@riim/duration';

await attempt(
	() => client.getAuth(),
	{
		onError: (err, retryNumber) => {
			console.error('Error', err.message);

			return retryNumber * duration.s5;
		}
	}
);
```
В примере первый повтор произойдёт мгновенно, так как `retryNumber` при первом срабатывании onError будет 0, второй повтор произойдёт с задержкой в 5 секунд и дальше задержка будет каждый раз увеличиваться на 5 секунд.
Не срабатывает если попытка прервана по таймауту.
По умолчанию - null.
- `onTimeout` - Обработчик прерывания попытки по таймауту. По умолчанию - null.
- `onRetry` - Запускается непосредственно перед повтором (то есть после дополнительной задержки (если она есть)). Первый аргумент - ошибка предыдущей попытки (в том числе `AttemptTimeoutError`, если попытка прервана по таймауту), второй - количество оставшихся попыток. По умолчанию - null.

## Configuration

Используемые по умолчанию значения можно изменить:
```js
import { configure } from '@riim/attempt';

configure({
	maxRetries: 2,
	timeout: 10000,
	timeoutAfterError: 1000,
	discardTimeoutedAttempts: true,
	onAttempt: null,
	onError: null,
	onTimeout: null,
	onRetry: null
});
```
