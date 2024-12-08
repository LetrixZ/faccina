import process from 'node:process';
import { Option } from 'commander';
import express from 'express';
import { handler } from './build/handler.js';
import program from './cli/commands';

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

const serve = async (hostname: string, port: number) => {
	const app = express();

	app.use((req, res, next) => {
		console.log(req.url);
		next();
	});

	app.use(handler);

	app.listen(port, hostname, () =>
		console.info(`[PID: ${process.pid}] Listening on ${hostname + ':' + port}`)
	);

	// const url = new URL(req.url);
	// const path = url.pathname.slice(1);

	// if (path in clientRoutes) {
	// 	const file: BunFile = clientRoutes[path];

	// 	const headers = new Headers({
	// 		'Content-Length': file.size.toString(),
	// 		'Content-Type': mimes[extname(path).slice(1)],
	// 		'Last-Modified': new Date(file.lastModified).toUTCString(),
	// 	});

	// 	if (path.includes('/immutable/')) {
	// 		headers.set('Cache-Control', 'public,max-age=31536000,immutable');
	// 	}

	// 	return new Response(await clientRoutes[path].bytes(), {
	// 		headers,
	// 	});
	// }
};

program
	.command('serve', { isDefault: true })
	.addOption(new Option('-H --hostname <HOST>', 'Web server hostname').default('0.0.0.0'))
	.addOption(new Option('-P --port <PORT>', 'Web server port').default(3000))
	.action((args: { hostname: string; port: string }) => {
		const hostname = args.hostname;
		const port = parseInt(args.port);
		serve(hostname, port);
	});

program.parse();
