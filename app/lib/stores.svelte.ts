import type { CollectionItem, SiteConfig, Tag } from './types';
import type { User } from 'lucia';

class AppState {
	user = $state<User>();
	userCollections = $state<CollectionItem[]>();
	siteConfig = $state<SiteConfig>({} as SiteConfig);
	tagList = $state<Tag[]>([]);
}

export const appState = new AppState();
