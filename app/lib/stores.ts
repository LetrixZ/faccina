import type { CollectionItem, SiteConfig, Tag } from './types';
import type { User } from 'lucia';
import { writable } from 'svelte/store';

export const query = writable('');
export const user = writable<User | null>();
export const siteConfig = writable<SiteConfig>({} as SiteConfig);
export const userCollections = writable<CollectionItem[] | undefined>(undefined);
export const tagList = writable<Tag[]>([]);
