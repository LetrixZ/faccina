import type { Order, Sort } from './schemas';

export interface Archive {
	id: number;
	slug: string;
	title: string;
	description: string | null;
	hash: string;
	path: string;
	pages: number;
	size: number;
	cover: ImageDimensions | null;
	thumbnail: number;
	language: string | null;
	images: Image[];
	created_at: string;
	released_at: string | null;
	deleted_at: string | null;
	has_metadata: boolean | null;
	artists: Taxonomy[];
	circles: Taxonomy[];
	magazines: Taxonomy[];
	events: Taxonomy[];
	publishers: Taxonomy[];
	parodies: Taxonomy[];
	tags: Tag[];
	sources: Source[];
}

export type ArchiveDetail = Omit<Archive, 'path' | 'has_metadata'>;

export type ArchiveId = Pick<ArchiveDetail, 'id' | 'slug'>;

export interface ArchiveListItem {
	id: number;
	hash: string;
	title: string;
	pages: number | null;
	thumbnail: number;
	cover: ImageDimensions | null;
	artists: Taxonomy[];
	circles: Taxonomy[];
	magazines: Taxonomy[];
	events: Taxonomy[];
	parodies: Taxonomy[];
	tags: Tag[];
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
	width: number | null;
	height: number | null;
}

export interface ImageDimensions {
	width: number | null;
	height: number | null;
}

export interface LibraryPage {
	archives: ArchiveListItem[];
	page: number;
	limit: number;
	total: number;
}

export interface SearchParams {
	query: string;
	sort: Sort;
	order: Order;
}

export interface Task {
	archive: ArchiveDetail;
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

export type UserFormState = 'login' | 'register' | 'recover' | 'reset';
