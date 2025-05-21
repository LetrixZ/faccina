import type { SiteConfig } from './types';
import { orderSchema, sortSchema, type Order, type Sort } from './schemas';
import { randomString } from './utils';

type QueryParams = {
	search: string;
	sort: Sort;
	order: Order;
	seed: string | null;
	page: number;
	limit: number;
	ids: number[] | null;
	series: boolean;
};

const initialQueryState: QueryParams = {
	search: '',
	sort: 'title',
	order: 'asc',
	seed: null,
	page: 1,
	limit: 0,
	ids: null,
	series: false,
};

export class Query {
	#params = $state(initialQueryState);

	get params() {
		return this.#params;
	}

	get search() {
		return this.#params.search;
	}

	set search(val) {
		this.#params.search = val;
		this.#params.page = 1;
	}

	get sort() {
		return this.#params.sort;
	}

	set sort(val) {
		if (val === 'random') {
			this.seed = randomString();
		} else {
			this.seed = null;
		}

		this.#params.sort = val;
	}

	get order() {
		return this.#params.order;
	}

	set order(val) {
		this.#params.order = val;
	}

	get seed() {
		return this.#params.seed;
	}

	set seed(val) {
		this.#params.seed = val;
	}

	get page() {
		return this.#params.page;
	}

	set page(val) {
		this.#params.page = val;
	}

	get limit() {
		return this.#params.limit;
	}

	set limit(val) {
		this.#params.limit = val;
		this.#params.page = 1;
	}

	get ids() {
		return this.#params.ids;
	}

	set ids(val) {
		this.#params.ids = val;
	}

	constructor(params: QueryParams) {
		this.#params = params;
	}

	toggleOrder() {
		if (this.order === 'asc') {
			this.order = 'desc';
		} else {
			this.order = 'asc';
		}
	}

	static fromURL(url: URL, site: SiteConfig) {
		const params = structuredClone(initialQueryState);
		params.limit = site.defaultPageLimit;
		params.sort = site.defaultSort;
		params.order = site.defaultOrder;

		const searchParam = url.searchParams.get('q');

		if (searchParam !== null) {
			params.search = searchParam;
		}

		const sortParam = url.searchParams.get('sort');

		if (sortParam !== null) {
			const { data } = sortSchema.safeParse(sortParam);

			if (data) {
				params.sort = data;
			}
		}

		const orderParam = url.searchParams.get('order');

		if (orderParam !== null) {
			const { data } = orderSchema.safeParse(orderParam);

			if (data) {
				params.order = data;
			}
		}

		const seedParam = url.searchParams.get('seed');

		if (seedParam !== null) {
			params.seed = seedParam;
		}

		const pageParam = url.searchParams.get('page');

		if (pageParam !== null) {
			const parsedPage = parseInt(pageParam);

			if (!isNaN(parsedPage)) {
				params.page = parsedPage;
			}
		}

		const limitParam = url.searchParams.get('limit');

		if (limitParam !== null) {
			const parsedLimit = parseInt(limitParam);

			if (!isNaN(parsedLimit) && site.pageLimits.includes(parsedLimit)) {
				params.limit = parsedLimit;
			}
		}

		const idsParam = url.searchParams.get('ids');

		if (idsParam) {
			params.ids = idsParam
				.split(',')
				.map((id) => parseInt(id))
				.filter((id) => !isNaN(id));
		}

		return new Query(params);
	}

	toSearchParams(params: URLSearchParams, site: SiteConfig) {
		const _params = new URLSearchParams(params);

		if (this.search.length) {
			_params.set('q', this.search);
		}

		if (this.sort !== site.defaultSort) {
			_params.set('sort', this.sort);
		} else {
			_params.delete('sort');
		}

		if (this.order !== site.defaultOrder) {
			_params.set('order', this.order);
		} else {
			_params.delete('order');
		}

		if (this.seed !== null) {
			_params.set('seed', this.seed);
		} else {
			_params.delete('seed');
		}

		_params.set('page', this.page.toString());

		if (this.limit !== site.defaultPageLimit) {
			_params.set('limit', this.limit.toString());
		} else {
			_params.delete('limit');
		}

		if (this.ids?.length) {
			_params.set('ids', this.ids.join(','));
		}

		return _params;
	}

	toURL(current: URL, site: SiteConfig) {
		const url = new URL(current);
		url.search = this.toSearchParams(url.searchParams, site).toString();
		return url;
	}
}
