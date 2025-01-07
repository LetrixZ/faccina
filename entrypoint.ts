import cluster from 'node:cluster';
import { mkdir } from 'node:fs/promises';
import { cpus } from 'node:os';
import { join, parse } from 'node:path';
import { extname } from 'path';
import { Option } from 'commander';
import { BunFile, ServeOptions } from 'bun';
import tmp from 'tmp';
import { build_options, env, handler_default } from './build/handler';
import clientRoutes from './compile/client-routes';
import './compile/sharp';
import { runtimePlatformArch } from './node_modules/sharp/lib/libvips';

const mimes = {
	gz: 'application/gzip',
	js: 'application/javascript',
	mjs: 'application/javascript',
	json: 'application/json',
	json5: 'application/json5',
	jsonml: 'application/jsonml+json',
	jsonld: 'application/ld+json',
	webmanifest: 'application/manifest+json',
	cjs: 'application/node',
	pdf: 'application/pdf',
	toml: 'application/toml',
	wasm: 'application/wasm',
	xml: 'application/xml',
	zip: 'application/zip',
	ttc: 'font/collection',
	otf: 'font/otf',
	ttf: 'font/ttf',
	woff: 'font/woff',
	woff2: 'font/woff2',
	exr: 'image/aces',
	apng: 'image/apng',
	avif: 'image/avif',
	bmp: 'image/bmp',
	cgm: 'image/cgm',
	drle: 'image/dicom-rle',
	emf: 'image/emf',
	fits: 'image/fits',
	g3: 'image/g3fax',
	gif: 'image/gif',
	heic: 'image/heic',
	heics: 'image/heic-sequence',
	heif: 'image/heif',
	heifs: 'image/heif-sequence',
	hej2: 'image/hej2k',
	hsj2: 'image/hsj2',
	ief: 'image/ief',
	jls: 'image/jls',
	jp2: 'image/jp2',
	jpg2: 'image/jp2',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	jpe: 'image/jpeg',
	jph: 'image/jph',
	jhc: 'image/jphc',
	jpm: 'image/jpm',
	jpx: 'image/jpx',
	jpf: 'image/jpx',
	jxr: 'image/jxr',
	jxra: 'image/jxra',
	jxrs: 'image/jxrs',
	jxs: 'image/jxs',
	jxsc: 'image/jxsc',
	jxsi: 'image/jxsi',
	jxss: 'image/jxss',
	ktx: 'image/ktx',
	ktx2: 'image/ktx2',
	png: 'image/png',
	btif: 'image/prs.btif',
	pti: 'image/prs.pti',
	sgi: 'image/sgi',
	svg: 'image/svg+xml',
	svgz: 'image/svg+xml',
	t38: 'image/t38',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	tfx: 'image/tiff-fx',
	webp: 'image/webp',
	wmf: 'image/wmf',
	css: 'text/css',
	csv: 'text/csv',
	html: 'text/html',
	htm: 'text/html',
	shtml: 'text/html',
	jade: 'text/jade',
	jsx: 'text/jsx',
	markdown: 'text/markdown',
	n3: 'text/n3',
	txt: 'text/plain',
	log: 'text/plain',
	yaml: 'text/yaml',
	yml: 'text/yaml',
};

const serve = async (hostname: string | undefined, port: number | undefined) => {
	const { httpserver } = handler_default(build_options.assets ?? true);

	const serverOptions = {
		fetch: async (req, srv) => {
			const url = new URL(req.url);
			const path = url.pathname.slice(1);

			if (path in clientRoutes) {
				const file: BunFile = clientRoutes[path];

				const headers = new Headers({
					'Content-Length': file.size.toString(),
					'Content-Type': mimes[extname(path).slice(1)],
					'Last-Modified': new Date(file.lastModified).toUTCString(),
				});

				if (path.includes('/immutable/')) {
					headers.set('Cache-Control', 'public,max-age=31536000,immutable');
				}

				return new Response(await clientRoutes[path].bytes(), {
					headers,
				});
			}

			return httpserver(req, srv);
		},
		hostname,
		port,
		development: env('SERVERDEV', build_options.development ?? false),
		error(error) {
			console.error(error);
			return new Response('Uh oh!!', { status: 500 });
		},
	} satisfies ServeOptions;

	console.info(`[PID: ${process.pid}] Listening on ${hostname + ':' + port}`);

	Bun.serve(serverOptions);
};

if (Bun.embeddedFiles.length) {
	const runtimePlatform = runtimePlatformArch();

	if (runtimePlatform.includes('win32')) {
		const sharpLibs = Bun.embeddedFiles.filter((file) =>
			/^(sharp|libvips).*(node|dll)$/.test(file.name)
		);

		if (!sharpLibs.length) {
			throw new Error('Necessary embedded files not found');
		}

		tmp.setGracefulCleanup();
		const tmpobj = tmp.dirSync();

		const sharpDir = join(tmpobj.name, `sharp-${runtimePlatform}`, 'lib');
		await mkdir(sharpDir, { recursive: true });

		for (const file of sharpLibs) {
			const path = join(sharpDir, `${parse(file.name).name.slice(0, -9)}${parse(file.name).ext}`);
			await Bun.write(path, await file.bytes());

			if (file.name.startsWith('sharp-')) {
				global.sharpPath = path;
			}
		}
	} else {
		const libvipsLib = Bun.embeddedFiles.find((file) => /libvips-cpp.*/g.test(file.name));
		const sharpLib = Bun.embeddedFiles.find((file) => /sharp-.*\.node/g.test(file.name));

		if (!libvipsLib || !sharpLib) {
			throw new Error('Necessary embedded files not found');
		}

		tmp.setGracefulCleanup();
		const tmpobj = tmp.dirSync();

		const libvipsDir = join(tmpobj.name, `sharp-libvips-${runtimePlatform}`, 'lib');
		await mkdir(libvipsDir, { recursive: true });
		const libvipsPath = join(
			libvipsDir,
			`${parse(libvipsLib.name).name.slice(0, -9)}${parse(libvipsLib.name).ext}`
		);
		await Bun.write(libvipsPath, await libvipsLib.bytes());

		const sharpDir = join(tmpobj.name, `sharp-${runtimePlatform}`, 'lib');
		await mkdir(sharpDir, { recursive: true });
		const sharpPath = join(
			sharpDir,
			`${parse(sharpLib.name).name.slice(0, -9)}${parse(sharpLib.name).ext}`
		);
		await Bun.write(sharpPath, await sharpLib.bytes());

		global.sharpPath = sharpPath;
	}
}

import('./cli/commands').then(({ default: program }) => {
	program
		.command('serve', { isDefault: true })
		.addOption(new Option('--cluster'))
		.addOption(new Option('-H --hostname <HOST>', 'Web server hostname').default('0.0.0.0'))
		.addOption(new Option('-P --port <PORT>', 'Web server port').default(3000))
		.action((args?: { hostname: string; port: string; cluster: boolean }) => {
			if (args?.cluster && cluster.isPrimary) {
				for (let i = 0; i < cpus().length; i++) {
					cluster.fork();
				}
			} else {
				serve(args?.hostname, args?.port ? parseInt(args.port) : undefined);
			}
		});

	program.parse();
});
