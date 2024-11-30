import 'svelte/elements';
import 'unplugin-icons/types/svelte';

import type { Worker } from 'node:worker_threads';
import type { Message } from '$lib/types';

export interface AnalyticsWorker extends Worker {
	postMessage(message: Message): void;
}

declare global {
	namespace App {
		interface Error {
			status?: number;
			message: string;
		}

		interface PageState {
			page?: number;
			searchOpen?: boolean;
		}

		interface Locals {
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
			analytics?: AnalyticsWorker;
		}
	}

	declare module '*?raw-hex' {
		const src: string;
		export default src;
	}

	interface Uint8ArrayConstructor {
		fromHex: (hex: string) => Uint8Array;
	}

	namespace svelteHTML {
		interface HTMLAttributes {
			'on:dropItem'?: (event: CustomEvent<number>) => void;
		}
	}
}

declare module 'svelte/elements' {
	interface HTMLAttributes<T extends EventTarget> extends AriaAttributes, DOMAttributes<T> {
		tw?: string;
	}
}

export {};
