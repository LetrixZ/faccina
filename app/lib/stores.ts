import { writable } from 'svelte/store';
import type { User } from 'lucia';
import type { Tag, SiteConfig, CollectionItem } from './types';

export const query = writable('');
export const user = writable<User | null>();
export const siteConfig = writable<SiteConfig>({} as SiteConfig);
export const userCollections = writable<CollectionItem[] | undefined>(undefined);
export const tagList = writable<Tag[]>([]);
