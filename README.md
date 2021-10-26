# Attempt

## Installation

```
npm install @riim/attempt --save
```

## Example

```js
import { attempt } from '@riim/attempt';
import { interval10s, interval1s } from '@riim/interval';

await attempt(
	() => client.getAuth(),
	{
		maxRetries: 10,
		timeout: interval10s,
		timeoutAfterError: interval1s,
		onError: (err) => {
			console.error('Error', err.message);
		},
		onTimeout: () => {
			console.error('Timeout');
		},
		onRetry: (err, leftRetries) => {
			console.warn('!!! RETRY', leftRetries);
		}
		defaultValue: null
	}
);
```

## Options

- `maxRetries` - максимальное количество повторов. При этом первая попытка повтором не является, то есть если указано 2, то может быть до 3-х попыток из которых 2 будут повторами. По умолчанию - 2.
- `timeout` -  Ограничение по времени попытки в миллисекундах. Можно установить в 0 - нет ограничения. По умолчанию - 15 секунд.
- `timeoutAfterError` - Дополнительная задержка перед повтором после ошибки. Дополнительной задержки нет если повтор происходит из-за прерывания попытки по таймауту. Можно установить в 0. По умолчанию - 1 секунда.
- `onError` - Обработчик ошибки. Первый аргумент - ошибка, второй - номер повтора. При первом срабатывании номер повтора будет 0 (если не было прерывания по таймауту), так как первая попытка повтором не является. Может возвращять число миллисекунд до повтора переопределяя timeoutAfterError. Таким образом можно гибко управлять стратегией изменения timeoutAfterError:
```js
import { attempt } from '@riim/attempt';
import { interval5s } from '@riim/interval';

await attempt(
	() => client.getAuth(),
	{
		onError: (err, retryNumber) => {
			console.error('Error', err.message);

			return retryNumber * interval5s;
		}
	}
);
```
В примере первый повтор произойдёт мгновенно, так как `retryNumber` при первом срабатывании onError будет 0, второй повтор произойдёт с задержкой в 5 секунд и дальше задержка будет каждый раз увеличиваться на 5 секунд.
Не срабатывает если попытка прервана по таймауту.
По умолчанию - null.
- `onTimeout` - Обработчик прерывания попытки по таймауту. По умолчанию - null.
- `onRetry` - Запускается непосредственно перед повтором (то есть после дополнительной задержки (если она есть)). Первый аргумент - ошибка предыдущей попытки (в том числе `AttemptTimeoutError`, если попытка прервана по таймауту), второй - количество оставшихся попыток. По умолчанию - null.
- `defaultValue` - Используется если ни одна попытка не окажется успешной. Если равен undefined, то будет брошена последняя ошибка (в том числе `AttemptTimeoutError`). При любом другом значении оно будет возвращено. По умолчанию - undefined.

## Configuration

Используемые по умолчанию значения можно изменить:
```js
import { configure } from '@riim/attempt';
import { interval15s, interval1s } from '@riim/interval';

configure({
	maxRetries: 2,
	timeout: interval15s,
	timeoutAfterError: interval1s,
	onError: null,
	onTimeout: null,
	onRetry: null,
	defaultValue: undefined
});
```
