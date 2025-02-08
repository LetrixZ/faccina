import { createHash, Hash } from 'node:crypto';
import { access, mkdir, readFile, writeFile as writeFileNode } from 'node:fs/promises';
import { parse } from 'node:path';
import type { CryptoHasher } from 'bun';
import { glob as nodeGlob } from 'glob';

export const exists = async (path: string) => {
	if (typeof Bun !== 'undefined') {
		return Bun.file(path).exists();
	} else {
		return access(path)
			.then(() => true)
			.catch(() => false);
	}
};

export const writeFile = async (path: string, input: Uint8Array | string) => {
	if (typeof Bun !== 'undefined') {
		return Bun.write(path, input);
	} else {
		await mkdir(parse(path).dir, { recursive: true }).catch(() => {});
		return writeFileNode(path, input);
	}
};

export async function openFile(path: string, type: 'text'): Promise<string>;
export async function openFile(
	path: string,
	type?: 'bytes'
): Promise<Uint8Array | Buffer<ArrayBufferLike>>;

export async function openFile(path: string, type: 'bytes' | 'text' = 'bytes') {
	if (typeof Bun !== 'undefined') {
		const file = Bun.file(path);

		if (type === 'bytes') {
			return file.bytes();
		} else {
			return file.text();
		}
	} else {
		const file = await readFile(path);

		if (type === 'bytes') {
			return file;
		} else {
			return file.toString('utf8');
		}
	}
}

export const hashPassword = async (
	password: string,
	options?: { memoryCost: number; timeCost: number }
) => {
	if (typeof Bun !== 'undefined') {
		return Bun.password.hash(password, { algorithm: 'argon2id', ...options });
	} else {
		return import('argon2').then((m) => m.hash(password, options));
	}
};

export const verifyPassword = async (password: string, hash: string) => {
	if (typeof Bun !== 'undefined') {
		return Bun.password.verify(password, hash);
	} else {
		return import('argon2').then((m) => m.verify(hash, password));
	}
};

class Hasher {
	hasher: CryptoHasher | Hash;

	constructor() {
		if (typeof Bun !== 'undefined') {
			this.hasher = new Bun.CryptoHasher('sha256');
		} else {
			this.hasher = createHash('sha256');
		}
	}

	update = (input: string | Buffer) => {
		if (this.hasher instanceof Hash) {
			this.hasher.update(input);
		} else {
			this.hasher.update(input);
		}

		return this;
	};

	digest = () => {
		if (this.hasher instanceof Hash) {
			return this.hasher.digest('hex');
		} else {
			return this.hasher.digest('hex');
		}
	};
}

export const createHasher = () => new Hasher();

export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export const glob = (
	pattern: string,
	options?: {
		cwd?: string;
		absolute?: boolean;
		dot?: boolean;
		followSymlinks?: boolean;
		onlyFiles?: boolean;
	}
) => {
	if (typeof Bun !== 'undefined') {
		return Array.from(
			new Bun.Glob(pattern).scanSync({
				cwd: options?.cwd,
				absolute: options?.absolute,
				dot: options?.dot,
				followSymlinks: options?.followSymlinks,
				onlyFiles: options?.onlyFiles,
			})
		);
	} else {
		return nodeGlob.sync(pattern, {
			cwd: options?.cwd,
			absolute: options?.absolute,
			dot: options?.dot,
			follow: options?.followSymlinks,
			nodir: options?.onlyFiles !== undefined ? options.onlyFiles : true,
		});
	}
};
