import 'svelte/elements';

declare global {
	namespace App {
		interface Error {
			status?: number;
			message: string;
		}

		interface PageState {
			page?: number;
			searchOpen?: boolean;
			readerPreferencesOpen?: boolean;
			settingsOpen?: boolean;
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
