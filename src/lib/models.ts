import type { Order, Sort } from './schemas';
import type { Gallery } from './types';

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
	artists: Tag[];
	circles: Tag[];
	magazines: Tag[];
	events: Tag[];
	publishers: Tag[];
	parodies: Tag[];
	tags: Tag[];
	sources: Source[];
	protected: boolean;
}

export type ArchiveDetail = Omit<Archive, 'path' | 'has_metadata' | 'protected'>;

export type ArchiveId = Pick<ArchiveDetail, 'id' | 'slug'>;

export interface ArchiveListItem {
	id: number;
	hash: string;
	title: string;
	pages: number | null;
	thumbnail: number;
	cover: ImageDimensions | null;
	artists: Tag[];
	circles: Tag[];
	magazines: Tag[];
	events: Tag[];
	parodies: Tag[];
	tags: Tag[];
	deleted_at: string | null;
}

export type TagType = 'artist' | 'circle' | 'magazine' | 'event' | 'publisher' | 'parody' | 'tag';

export interface TagId extends Tag {
	id: number;
}

export interface Tag {
	slug: string;
	name: string;
	namespace?: string;
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
	gallery: Gallery;
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
	artists: TagId[];
	circles: TagId[];
	magazines: TagId[];
	events: TagId[];
	publishers: TagId[];
	parodies: TagId[];
	tags: TagId[];
}

export type UserFormState = 'login' | 'register' | 'recover' | 'reset';

export type TaxonomyItem = {
	slug: string;
	name: string;
	type: 'artist' | 'circle' | 'magazine' | 'event' | 'publisher' | 'parody' | 'tag';
};
