import type { PathLike } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import config from './config';

export const exists = async (path: PathLike) =>
	access(path)
		.then(() => true)
		.catch(() => false);

export const imageDirectory = (hash: string) =>
	join(config.directories.images, hash.substring(0, 2), hash.substring(2, 4), hash);
