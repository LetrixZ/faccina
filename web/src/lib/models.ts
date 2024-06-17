export interface Archive {
	id: number;
	slug: string;
	title: string;
	description: string | null;
	hash: string;
	pages: number;
	size: number;
	cover: ImageDimensions | null;
	thumbnail: number;
	images: Image[];
	created_at: string;
	released_at: string;
	artists: Taxonomy[];
	circles: Taxonomy[];
	magazines: Taxonomy[];
	publishers: Taxonomy[];
	parodies: Taxonomy[];
	tags: Tag[];
	sources: Source[];
}

export type ArchiveId = Pick<Archive, 'id' | 'slug'>;

export interface ArchiveListItem {
	id: number;
	slug: string;
	title: string;
	cover?: ImageDimensions;
	artists: Taxonomy[];
	circles: Taxonomy[];
	magazines: Taxonomy[];
	parodies: Taxonomy[];
	tags: Tag[];
	rank: number;
}

export enum TagType {
	ARTIST = 'artist',
	CIRCLE = 'circle',
	MAGAZINE = 'magazine',
	PUBLISHER = 'publisher',
	PARODY = 'parody',
	TAG = 'tag',
}

export interface Taxonomy {
	slug: string;
	name: string;
}

export interface Tag {
	slug: string;
	name: string;
	namespace: string | null;
}

export interface Source {
	name: string;
	url: string | null;
}

export interface Image {
	page_number: number;
	width: number;
	height: number;
}

export interface ImageDimensions {
	width: number;
	height: number;
}

export interface LibraryPage {
	archives: ArchiveListItem[];
	page: number;
	limit: number;
	total: number;
	errors: {} | null;
}

export interface SearchParams {
	query: string;
	sort: Sorting;
	order: Ordering;
}

export enum Sorting {
	RELEVANCE = 'relevance',
	RELEASED_AT = 'released_at',
	CREATED_AT = 'created_at',
	TITLE = 'title',
	PAGES = 'pages',
}

export enum Ordering {
	ASC = 'asc',
	DESC = 'desc',
}

export interface Task {
	archive: Archive;
	progress: number;
	total: number;
	complete: boolean;
}
