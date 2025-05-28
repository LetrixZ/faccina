import { z } from 'zod';
import { type Order, type Sort } from './schemas';

export type TagNamespace =
	| 'artist'
	| 'circle'
	| 'magazine'
	| 'event'
	| 'publisher'
	| 'parody'
	| 'tag'
	| string;

export type Tag = {
	namespace: TagNamespace;
	name: string;
};

export type Image = {
	filename: string;
	pageNumber: number;
	width: number | null;
	height: number | null;
};

export type Source = {
	name: string;
	url: string | null;
};

export type Gallery = {
	id: number;
	hash: string;
	title: string;
	description: string | null;
	pages: number;
	thumbnail: number;
	language: string | null;
	size: number;
	createdAt: string;
	releasedAt: string | null;
	deletedAt: string | null;
	tags: Tag[];
	images: Image[];
	sources: Source[];
	series: { id: number; title: string }[];
	favorite: boolean;
};

export type Archive = {
	id: number;
	hash: string;
	path: string;
	title: string;
	description: string | null;
	pages: number;
	thumbnail: number;
	language: string | null;
	size: number;
	protected: boolean;
	createdAt: string;
	releasedAt: string | null;
	deletedAt: string | null;
	tags: Tag[];
	images: Image[];
	sources: Source[];
	series: { title: string; order: number }[];
};

export type GalleryItem = {
	id: number;
	hash: string;
	title: string;
	pages: number;
	tags: Tag[];
	thumbnail: number;
	deletedAt: string | null;
};

export type SeriesListItem = {
	id: number;
	title: string;
	hash: string | null;
	thumbnail: number | null;
	chapterCount: number;
	tags: Tag[];
};

export type Collection = {
	id: number;
	name: string;
	slug: string;
	protected: boolean;
	archives: Pick<Archive, 'id' | 'title' | 'hash' | 'thumbnail' | 'deletedAt'>[];
};

export type CollectionItem = {
	id: number;
	name: string;
	slug: string;
	protected: boolean;
	archives: number[];
};

export type HistoryEntry = {
	lastPage: number;
	startPage: number;
	startedAt: string;
	lastReadAt: string;
	finishedAt: string | null;
	archive: Pick<Archive, 'id' | 'title' | 'hash' | 'pages' | 'thumbnail' | 'tags'>;
};

export type LibraryResponse<T> = {
	data: T[];
	page: number;
	limit: number;
	total: number;
	seed?: string;
};

export type GalleryLibraryResponse = LibraryResponse<GalleryItem>;

export type User = {
	id: string;
	username: string;
	admin: boolean;
};

export type SiteConfig = {
	name: string;
	enableUsers: boolean;
	enableCollections: boolean;
	enableReadHistory: boolean;
	hasMailer: boolean;
	defaultSort: Sort;
	defaultOrder: Order;
	guestDownloads: boolean;
	guestAccess: boolean;
	searchPlaceholder: string;
	defaultPageLimit: number;
	pageLimits: number[];
	clientSideDownloads: boolean;
	imageServer: string;
	admin: {
		deleteRequireConfirmation: boolean;
	};
};

export const readStatSchema = z.object({
	archiveId: z.number(),
	isLastPage: z.boolean(),
	pageNumber: z.number(),
});

export type ReadStat = z.infer<typeof readStatSchema>;

export type ListPageType = 'main' | 'favorites' | 'collection' | 'series';

export type ImageArchive = {
	id: number;
	hash: string;
	path: string;
	pages: number;
	filename: string;
	pageNumber: number;
	width: number | null;
	height: number | null;
};

export type Pagination<T> = {
	data: T[];
	page: number;
	total: number;
	limit: number;
};
