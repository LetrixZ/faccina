import { writable } from 'svelte/store';
import type { Tag, SiteConfig } from './types';

export const query = writable('');
export const siteConfig = writable<SiteConfig>({} as SiteConfig);
export const tagList = writable<Tag[]>([]);
