import fsSync from 'node:fs';
import fs, { readFile } from 'node:fs/promises';
import filepath, { join } from 'node:path';
import config from './config';
import type { Dirent, GlobOptionsWithFileTypes, PathLike } from 'node:fs';

export const imageDirectory = (hash: string) =>
	filepath.join(config.directories.images, hash.substring(0, 2), hash.substring(2, 4), hash);

export const exists = (path: PathLike) =>
	fs
		.access(path)
		.then(() => true)
		.catch(() => false);

export const readText = (path: PathLike) => readFile(path).then((file) => file.toString('utf8'));

export const createFile = async (
	path: string,
	data: string | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>
) => {
	const dirname = filepath.dirname(path);

	if (!(await exists(dirname))) {
		await fs.mkdir(dirname, { recursive: true });
	}

	fs.writeFile(path, data, 'utf8');
};

type GlobOptions = {
	cwd?: string;
	followSymlinks?: boolean;
	onlyFiles?: boolean;
	absolute?: boolean;
	dot?: boolean;
};

const DEFAULT_GLOB_OPTIONS: Required<GlobOptions> = {
	cwd: process.cwd(),
	followSymlinks: false,
	onlyFiles: true,
	absolute: false,
	dot: false,
};

export const createGlobMatcher = (pattern: string) => {
	const shouldExclude = (entry: Dirent, options: GlobOptions): boolean => {
		if (options.onlyFiles && entry.isDirectory()) {
			return true;
		}

		if (!options.followSymlinks && entry.isSymbolicLink()) {
			return true;
		}

		if (!options.dot && entry.name.startsWith('.')) {
			return true;
		}

		return false;
	};

	const normalizeOptions = (options: GlobOptions | string): GlobOptionsWithFileTypes => {
		const baseOptions =
			typeof options === 'string'
				? { ...DEFAULT_GLOB_OPTIONS, cwd: options }
				: { ...DEFAULT_GLOB_OPTIONS, ...options };

		return {
			cwd: baseOptions.cwd,
			withFileTypes: true,
			exclude: (entry) => shouldExclude(entry, baseOptions),
		};
	};

	const scan = (options: GlobOptions | string = {}) =>
		Array.fromAsync(fs.glob(pattern, normalizeOptions(options))).then((entries) =>
			entries.map((entry) => join(entry.parentPath, entry.name))
		);

	const scanSync = (options: GlobOptions | string = {}) =>
		Array.from(fsSync.globSync(pattern, normalizeOptions(options))).map((entry) =>
			join(entry.parentPath, entry.name)
		);

	return {
		scan,
		scanSync,
	};
};
