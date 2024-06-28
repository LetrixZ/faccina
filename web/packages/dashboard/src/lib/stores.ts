import { Ordering, Sorting } from 'shared/models';
import { get, writable } from 'svelte/store';

type Params = {
	query: string;
	page: number;
	limit: number | undefined;
	sort: Sorting;
	order: Ordering;
	deleted: boolean;
};

const createSearchParams = () => {
	const fromURL = () => {
		const params = new URLSearchParams(location.search);

		const sort = params.get('sort');
		const order = params.get('order');
		const deleted = params.get('unpublished');

		return {
			query: params.get('q') ?? '',
			page: parseInt(params.get('page') ?? '1'),
			limit: parseInt(params.get('limit') ?? '50'),
			sort: sort ? (sort as Sorting) : Sorting.RELEASED_AT,
			order: order ? (order as Ordering) : Ordering.DESC,
			deleted: deleted ? deleted === '1' : true
		};
	};

	const store = writable<Params>(fromURL());

	const toString = () => {
		const stored = get(store);

		const params = new URLSearchParams();

		if (stored.query.length) {
			params.set('q', stored.query);
		}

		if (stored.limit) {
			params.set('limit', stored.limit.toString());
		}

		if (stored.page > 1) {
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

		return '';
	};

	const set = (value: Params) => {
		store.set(value);
		history.pushState(null, '', toString());
	};

	const setParams = (items: Partial<Params>) => set({ ...get(store), ...items });

	const setFromURL = () => store.set(fromURL());

	return {
		set,
		setParams,
		setFromURL,
		toString,
		subscribe: store.subscribe
	};
};

export const searchParams = createSearchParams();
