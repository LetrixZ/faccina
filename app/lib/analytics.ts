import type { Message } from './types';

declare let self: Worker;

self.onmessage = (event: MessageEvent<Message>) => {
	console.info(event.data);
};
