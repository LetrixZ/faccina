import { z } from 'zod';
import {
	createCollectionSchema,
	editArchiveSchema,
	editTagsSchema,
	type Order,
	type Sort,
} from './schemas';
import { searchSchema } from './server/utils';

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
	thumbnail: number;
	deletedAt: string | null;
};

export const messageSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('search_main'),
		payload: z.object({
			data: searchSchema,
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('search_favorites'),
		payload: z.object({
			data: searchSchema,
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('gallery_view'),
		payload: z.object({
			archiveId: z.number(),
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('gallery_download_server'),
		payload: z.object({
			archiveId: z.number(),
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('gallery_start_read'),
		payload: z.object({
			archiveId: z.number(),
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('gallery_read_page'),
		payload: z.object({
			pageNumber: z.number(),
			isLastPage: z.boolean(),
			archiveId: z.number(),
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('gallery_finish_read'),
		payload: z.object({
			archiveId: z.number(),
			userId: z.string().optional(),
		}),
	}),
	z.object({
		action: z.literal('gallery_update_info'),
		payload: z.object({
			archiveId: z.number(),
			data: editArchiveSchema,
			userId: z.string(),
		}),
	}),
	z.object({
		action: z.literal('gallery_update_tags'),
		payload: z.object({
			archiveId: z.number(),
			data: editTagsSchema,
			userId: z.string(),
		}),
	}),
	z.object({
		action: z.literal('user_login'),
		payload: z.object({ userId: z.string() }),
	}),
	z.object({
		action: z.literal('user_logout'),
		payload: z.object({ userId: z.string() }),
	}),
	z.object({
		action: z.literal('user_register'),
		payload: z.object({ userId: z.string() }),
	}),
	z.object({
		action: z.literal('user_account_recovery_start'),
		payload: z.object({ username: z.string() }),
	}),
	z.object({
		action: z.literal('user_account_recovery_complete'),
		payload: z.object({ userId: z.string() }),
	}),
	z.object({
		action: z.literal('user_blacklist_update'),
		payload: z.object({
			blacklist: z.array(z.string()),
			userId: z.string(),
		}),
	}),
	z.object({
		action: z.literal('user_account_update'),
		payload: z.object({ userId: z.string() }),
	}),
	z.object({
		action: z.literal('user_account_delete'),
		payload: z.object({ userId: z.string() }),
	}),
	z.object({
		action: z.literal('collection_create'),
		payload: z.object({
			data: createCollectionSchema,
			userId: z.string(),
		}),
	}),
	z.object({
		action: z.literal('collection_update'),
		payload: z.object({
			data: createCollectionSchema,
			userId: z.string(),
		}),
	}),
	z.object({
		action: z.literal('app_navigation'),
		payload: z
			.object({
				from: z
					.object({
						params: z.record(z.string(), z.string()).nullable(),
						route: z.record(z.string().nullable()),
						url: z.unknown(),
					})
					.nullable(),
				to: z
					.object({
						params: z.record(z.string(), z.string()).nullable(),
						route: z.record(z.string().nullable()),
						url: z.unknown(),
					})
					.nullable(),
			})
			.nullable()
			.catch(null),
	}),
]);

export type Message = z.infer<typeof messageSchema>;

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
	archives: Pick<Archive, 'id'>[];
};

export type HistoryEntry = {
	lastPage: number;
	startPage: number;
	startedAt: string;
	lastReadAt: string;
	finishedAt: string | null;
	archive: Pick<Archive, 'id' | 'title' | 'hash' | 'pages' | 'thumbnail' | 'deletedAt' | 'tags'>;
};

export type LibraryResponse = {
	archives: GalleryListItem[];
	page: number;
	limit: number;
	total: number;
	seed?: string;
};

export type SiteConfig = {
	name: string;
	url?: string;
	enableUsers: boolean;
	enableCollections: boolean;
	enableReadHistory: boolean;
	hasMailer: boolean;
	defaultSort: Sort;
	defaultOrder: Order;
	guestDownloads: boolean;
	searchPlaceholder: string;
	defaultPageLimit: number;
	pageLimits: number[];
	clientSideDownloads: boolean;
};

export const readStatSchema = z.object({
	archiveId: z.number(),
	isLastPage: z.boolean(),
	pageNumber: z.number(),
});

export type ReadState = z.infer<typeof readStatSchema>;

export type ListPageType = 'main' | 'favorites' | 'collection';
