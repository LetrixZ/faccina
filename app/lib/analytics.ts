import chalk from 'chalk';
import type { Message } from './types';

declare let self: Worker;

self.onmessage = (event: MessageEvent<Message>) => {
	console.info(chalk.gray(`[${new Date().toISOString()}]`), event.data);
};
