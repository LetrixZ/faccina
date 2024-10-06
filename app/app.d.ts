import 'svelte/elements';
import 'unplugin-icons/types/svelte';

declare global {
	namespace App {
		interface Error {
			status?: number;
			message: string;
		}

		interface PageState {
			page: number;
		}

		interface Locals {
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
		}
	}

	declare module '*?raw-hex' {
		const src: string;
		export default src;
	}

	interface Uint8ArrayConstructor {
		fromHex: (hex: string) => Uint8Array;
	}
}

declare module 'svelte/elements' {
	interface HTMLAttributes<T extends EventTarget> extends AriaAttributes, DOMAttributes<T> {
		tw?: string;
	}
}

export {};
