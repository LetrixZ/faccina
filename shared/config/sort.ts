export const sortTypes = ['released_at', 'created_at', 'title', 'pages', 'random'] as const;
export const orderTypes = ['asc', 'desc'] as const;

export type SortType = (typeof sortTypes)[number];
export type OrderType = (typeof orderTypes)[number];

export const sortOptions: { value: SortType; label: string }[] = [
	{ value: 'released_at', label: 'Date released' },
	{ value: 'created_at', label: 'Date added' },
	{ value: 'title', label: 'Title' },
	{ value: 'pages', label: 'Pages' },
	{ value: 'random', label: 'Random' },
];

export const orderOptions: { value: OrderType; label: string }[] = [
	{ value: 'desc', label: 'Descending' },
	{ value: 'asc', label: 'Ascending' },
];
