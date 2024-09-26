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

		// interface PageData {}
		// interface Platform {}
	}
}

export {};
