import type { OrderType, SortType } from 'shared/config.schema';

export type FormValue = {
	directories: {
		content: string;
		images: string;
	};
	database: {
		vendor: string;
		path: string;
		database: string;
		user: string;
		password: string;
		host: string;
		port: number;
	};
	server: {
		logging: string | boolean;
		auto_unpack: boolean;
	};
	site: {
		site_name: string;
		url: string | undefined;
		enable_users: boolean;
		enable_collections: boolean;
		enable_read_history: boolean;
		admin_users: string[];
		default_sort: SortType;
		default_order: OrderType;
		guest_downloads: boolean;
		client_side_downloads: boolean;
		search_placeholder: string;
		store_og_images: boolean;
		secure_session_cookie: boolean;
	};
};
