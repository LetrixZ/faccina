import { writable } from 'svelte/store';
import type { Tag, SiteConfig, CollectionItem } from './types';

export const query = writable('');
export const siteConfig = writable<SiteConfig>({} as SiteConfig);
export const userCollections = writable<CollectionItem[]>([]);
export const tagList = writable<Tag[]>([]);
