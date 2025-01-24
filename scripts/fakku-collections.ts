import { join } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { parseArgs } from 'util';
import { parse } from 'node-html-parser';
// @ts-expect-error works
import { encode } from 'windows-1252';
import type { FakkuCollection } from './types';

const { values } = parseArgs({
	args: Bun.argv,
	options: { pageLimit: { type: 'string' }, ignoreCache: { type: 'boolean', default: false } },
	strict: true,
	allowPositionals: true,
});

const pageLimit = values.pageLimit ? parseInt(values.pageLimit) : 1;

const cacheDir = join('scripts', 'cache', 'fakku-collections');

const cookies = await Bun.file('scripts/cookies.txt').text();

const fetchPage = (url: string) => fetch(url, { headers: { cookie: cookies } });

const getPage = async (page: number) => {
	const filename = join(cacheDir, `_${page}.html`);
	const file = Bun.file(filename);

	if (values.ignoreCache === true && (await file.exists())) {
		return file.text();
	} else {
		console.log(`Fetching collection page ${page}`);
		const response = await fetchPage(`https://www.fakku.net/collections/page/${page}`);
		const html = await response.text();
		await Bun.write(filename, html);
		return html;
	}
};

const getPages = async () => {
	const pages = [];

	for (let i = 1; i <= pageLimit; i++) {
		const html = await getPage(i);
		pages.push(html);
	}

	return pages;
};

const getCollectionPage = async (slug: string, page: number) => {
	const filename = join(cacheDir, `${slug}-${page}.html`);
	const file = Bun.file(filename);

	let html: string;

	if (values.ignoreCache === true && (await file.exists())) {
		html = await file.text();
	} else {
		console.log(`Fetching "${slug}" page ${page}`);
		const url = `https://www.fakku.net/collections/${slug}/page/${page}`;
		const response = await fetchPage(url);

		if (response.status === 404) {
			return null;
		}

		html = await response.text();
		await Bun.write(filename, html);
	}

	return html;
};

const getCollection = async (slug: string) => {
	const firstPage = await getCollectionPage(slug, 1);

	if (!firstPage) {
		return;
	}

	const lastPageNumber = (() => {
		const href =
			parse(firstPage)
				.querySelector('.pagination-row a[title="Last Page"]')
				?.getAttribute('href') ??
			Array.from(parse(firstPage).querySelectorAll('.pagination-row a[title^="Page "]'))
				.at(-1)
				?.getAttribute('href');

		if (!href) {
			return 1;
		}

		return parseInt(href.split('/').at(-1)!);
	})();

	const pages: string[] = [firstPage];

	let current = 1;

	while (current < lastPageNumber) {
		current++;

		const page = await getCollectionPage(slug, current);

		if (page) {
			pages.push(page);
		}
	}

	const urls = [];

	for (const page of pages) {
		const root = parse(page);
		urls.push(
			...root
				.querySelectorAll('.col-comic')
				.map((element) => element.querySelector('a')!.getAttribute('href')!)
		);
	}

	const decoder = new StringDecoder('utf-8');
	decoder.write('With Senseiâ€¦ â¤ ');

	const title = parse(firstPage)
		.querySelector('.block.col-span-full.text-2xl.font-bold.text-brand-light.text-left')!
		.textContent.substring(
			0,
			parse(firstPage).querySelector(
				'.block.col-span-full.text-2xl.font-bold.text-brand-light.text-left'
			)!.textContent.length - ' Collection'.length
		);

	let decoded;
	try {
		decoded = Buffer.from(encode(title)).toString('utf-8');
	} catch {
		decoded = title;
	}

	return {
		title: decoded,
		slug,
		chapters: urls,
	};
};

const getCollections = async (html: string) => {
	const root = parse(html);
	const urls = root
		.querySelectorAll('.col-span-4.relative.space-y-3')
		.map((element) => element.querySelector('a')!.getAttribute('href')!);

	const collections = [];

	for (const url of urls) {
		const collection = await getCollection(url.substring('/collections/'.length));

		if (collection) {
			collections.push(collection);
		}
	}

	return collections;
};

const pages = await getPages();

let collections: FakkuCollection[] = [];

for (const page of pages) {
	const pageCollections = await getCollections(page);

	if (pageCollections) {
		collections.push(...pageCollections);
	}
}

collections = collections.filter((collection) => collection !== undefined);

const cleanedCollections: FakkuCollection[] = [];

for (const collection of collections) {
	if (collection.slug === 'the-room-we-cant-escape-until-my-girlfriend-sleep') {
		const index = cleanedCollections.findIndex(
			(c) => c.slug === 'the-room-we-cant-escape-until-my-girlfriend-sleeps'
		);
		cleanedCollections[index]?.chapters.push(...collection.chapters);
	} else {
		cleanedCollections.push(collection);
	}
}

Bun.write('scripts/fakku_collections.json', JSON.stringify(cleanedCollections, null, 2));
