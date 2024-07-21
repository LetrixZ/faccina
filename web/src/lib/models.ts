export interface Archive {
	id: number;
	slug: string;
	title: string;
	description?: string;
	hash: string;
	pages: number;
	size: number;
	cover?: ImageDimensions;
	thumbnail: number;
	images: Image[];
	created_at: string;
	released_at: string;
	artists?: Taxonomy[];
	circles?: Taxonomy[];
	magazines?: Taxonomy[];
	events?: Taxonomy[];
	publishers?: Taxonomy[];
	parodies?: Taxonomy[];
	tags?: Tag[];
	sources?: Source[];
}

export type ArchiveId = Pick<Archive, 'id' | 'slug'>;

export interface ArchiveListItem {
	id: number;
	hash: string;
	title: string;
	pages: number;
	thumbnail: number;
	cover?: ImageDimensions;
	artists?: Taxonomy[];
	circles?: Taxonomy[];
	magazines?: Taxonomy[];
	events?: Taxonomy[];
	parodies?: Taxonomy[];
	tags?: Tag[];
	rank: number;
}

export enum TagType {
	ARTIST = 'artist',
	CIRCLE = 'circle',
	MAGAZINE = 'magazine',
	EVENT = 'event',
	PUBLISHER = 'publisher',
	PARODY = 'parody',
	TAG = 'tag',
}

export interface Taxonomy {
	slug: string;
	name: string;
}

export interface TaxonomyId extends Taxonomy {
	id: number;
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
	filename: string;
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
	RANDOM = 'random',
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

export enum ImageSize {
	Original = 'original',
	FillWidth = 'fill-width',
	FillHeight = 'fill-height',
}

export enum TouchLayout {
	LeftToRight = 'ltr',
	RightToLeft = 'rtl',
}

export interface TaxonomyTypes {
	artists: TaxonomyId[];
	circles: TaxonomyId[];
	magazines: TaxonomyId[];
	events: TaxonomyId[];
	publishers: TaxonomyId[];
	parodies: TaxonomyId[];
	tags: TaxonomyId[];
}
