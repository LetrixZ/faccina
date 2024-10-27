export type Source = {
	name?: string;
	url?: string;
};

export type Image = {
	filename: string;
	pageNumber: number;
};

export type Tag = {
	namespace: string;
	name: string;
};

export type ArchiveMetadata = {
	title?: string;
	description?: string;
	thumbnail?: number;
	releasedAt?: Date;
	language?: string;
	tags?: Tag[];
	sources?: Source[];
	imageOrder?: Image[];
};
