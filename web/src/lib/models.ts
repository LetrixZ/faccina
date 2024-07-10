export interface Archive {
	id: number;
	key: string;
	title: string;
	description: string | null;
	thumbnail: number;
	pages: number | null;
	size: number | null;
	released_at: string | null;
	created_at: string;
	artists: Taxonomy[];
	circles: Taxonomy[];
	magazines: Taxonomy[];
	events: Taxonomy[];
	publishers: Taxonomy[];
	parodies: Taxonomy[];
	tags: Tag[];
	sources: Source[];
	images: Image[];
}

export type ArchiveId = Pick<Archive, 'id'>;

export interface ArchiveListItem {
	id: number;
	hash: string;
	title: string;
	thumbnail: number;
	pages: number | null;
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

export interface Tag {
	slug: string;
	name: string;
	namespace?: string;
}

export interface Source {
	name: string;
	url?: string;
}

export interface Image {
	filename: string;
	page_number: number;
	width: number | undefined;
	height: number | undefined;
}

export interface ImageDimensions {
	width: number | undefined;
	height: number | undefined;
}

export interface LibraryPage<T> {
	archives: T[];
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

export enum ImageFitMode {
	ImageWidth = 'image-width',
	MaxWidth = 'max-width',
	FitHeight = 'fit-height',
}

export interface ArchiveData {
	id: number;
	title: string;
	slug: string;
	description?: string;
	path: string;
	hash: string;
	pages: number;
	size: number;
	thumbnail: number;
	language?: string;
	created_at: string;
	released_at: string;
	deleted_at: string | null;
	has_metadata: boolean;
	artists: Taxonomy[];
	circles: Taxonomy[];
	magazines: Taxonomy[];
	events: Taxonomy[];
	publishers: Taxonomy[];
	parodies: Taxonomy[];
	tags: Tag[];
	sources: Source[];
	images: Image[];
	cover: ImageDimensions;
}

export enum ScrapeSite {
	HENTAG = 'hentag',
}

export interface UpdateArchive {
	id: number;
	title?: string;
	slug?: string;
	description?: string;
	path?: string;
	thumbnail?: number;
	language?: string;
	released_at?: string;
	has_metadata?: boolean;
	artists?: string[];
	circles?: string[];
	magazines?: string[];
	events?: string[];
	publishers?: string[];
	parodies?: string[];
	tags?: [string, string | null][];
	sources?: Source[];
	images?: Image[];
}
