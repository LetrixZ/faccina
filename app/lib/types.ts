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
	id: number;
	namespace: TagNamespace;
	name: string;
	displayName: string | null;
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
	createdAt: string;
	releasedAt: string | null;
	deletedAt: string | null;
	protected: boolean;
	tags: Tag[];
	images: Image[];
	sources: Source[];
};

export type GalleryListItem = {
	id: number;
	hash: string;
	title: string;
	pages: number;
	tags: Tag[];
	cover: Image | null;
	deletedAt: string | null;
};
