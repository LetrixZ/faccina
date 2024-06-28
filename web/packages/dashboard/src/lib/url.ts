import { derived, writable } from 'svelte/store';

export function createUrlStore(ssrUrl?: string) {
	if (typeof window === 'undefined') {
		const { subscribe } = writable(ssrUrl);
		return { subscribe };
	}

	const href = writable(window.location.href);

	const originalPushState = history.pushState;
	const originalReplaceState = history.replaceState;

	const updateHref = () => href.set(window.location.href);

	history.pushState = function (...args) {
		originalPushState.apply(this, args);
		updateHref();
	};

	history.replaceState = function (...args) {
		originalReplaceState.apply(this, args);
		updateHref();
	};

	window.addEventListener('popstate', updateHref);
	window.addEventListener('hashchange', updateHref);

	return {
		subscribe: derived(href, ($href) => new URL($href)).subscribe
	};
}

export default createUrlStore();
