import { Ordering, Sorting } from '$lib/models';
import { get, writable } from 'svelte/store';

type Params = {
	query: string | undefined;
	page: number | undefined;
	limit: number | undefined;
	sort: Sorting | undefined;
	order: Ordering | undefined;
	deleted: boolean | undefined;
};

const createSearchParams = () => {
	const fromURL = () => {
		const params = new URLSearchParams(location.search);

		const page = params.get('page') ?? undefined;
		const limit = params.get('limit') ?? undefined;
		const sort = (params.get('sort') as Sorting) ?? undefined;
		const order = (params.get('order') as Ordering) ?? undefined;
		const deleted = params.get('unpublished');

		return {
			query: params.get('q') ?? undefined,
			page: page && !isNaN(parseInt(page)) ? parseInt(page) : undefined,
			limit: limit && !isNaN(parseInt(limit)) ? parseInt(limit) : undefined,
			sort,
			order,
			deleted: deleted === '1' ? true : undefined,
		};
	};

	const store = writable<Params>(fromURL());

	const toString = () => {
		const stored = get(store);

		const params = new URLSearchParams();

		if (stored.query?.length) {
			params.set('q', stored.query);
		} else {
			params.delete('q');
		}

		if (stored.limit) {
			params.set('limit', stored.limit.toString());
		}

		if (stored.page && stored.page > 1) {
			params.set('page', stored.page.toString());
		}

		if (stored.sort) {
			params.set('sort', stored.sort);
		}

		if (stored.order) {
			params.set('order', stored.order);
		}

		if (stored.deleted) {
			params.set('unpublished', '1');
		}

		const str = params.toString();

		if (str.length) {
			return '?' + str;
		}

		return '/';
	};

	const set = (value: Params) => {
		store.set(value);
		history.pushState(null, '', toString());
	};

	const setParams = (items: Partial<Params>) => set({ ...get(store), ...items });

	const setFromURL = () => store.set(fromURL());

	const reset = () =>
		set({
			query: undefined,
			page: undefined,
			limit: undefined,
			sort: undefined,
			order: undefined,
			deleted: undefined,
		});

	return {
		set,
		setParams,
		setFromURL,
		toString,
		reset,
		subscribe: store.subscribe,
	};
};

export const searchParams = createSearchParams();
