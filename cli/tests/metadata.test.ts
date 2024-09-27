import { describe, expect, test } from 'bun:test';
import dayjs from 'dayjs';
import StreamZip from 'node-stream-zip';

import {
	addEmbeddedMetadata,
	addExternalMetadata,
	type Archive,
	getJsonSchema,
	getYamlSchema,
	MetadataFormat,
	MetadataSchema,
} from '../metadata';

const readZip = (path: string) => new StreamZip.async({ file: path });

describe('Metadata', () => {
	describe('Schema type', () => {
		test('Anchira 1', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/anchira_1.yaml').text())).toBe(
				MetadataSchema.Anchira
			);
		});

		test('Anchira 2', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/anchira_2.yaml').text())).toBe(
				MetadataSchema.Anchira
			);
		});

		test('Anchira 3', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/anchira_3.yaml').text())).toBe(
				MetadataSchema.Anchira
			);
		});

		test('CCDC06 1', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/ccdc06_1.yaml').text())).toBe(
				MetadataSchema.CCDC06
			);
		});

		test('CCDC06 2', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/ccdc06_2.yaml').text())).toBe(
				MetadataSchema.CCDC06
			);
		});

		test('CCDC06 3', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/ccdc06_3.yaml').text())).toBe(
				MetadataSchema.CCDC06
			);
		});

		test('CCDC06 4', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/ccdc06_4.yaml').text())).toBe(
				MetadataSchema.CCDC06
			);
		});

		test('HentaiNexus 1', async () => {
			expect(
				getYamlSchema(await Bun.file(__dirname + '/resources/hentainexus_1.yaml').text())
			).toBe(MetadataSchema.HentaiNexus);
		});

		test('Koharu 1', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/koharu_1.yaml').text())).toBe(
				MetadataSchema.Koharu
			);
		});

		test('Koharu 2', async () => {
			expect(getYamlSchema(await Bun.file(__dirname + '/resources/koharu_2.yaml').text())).toBe(
				MetadataSchema.Koharu
			);
		});

		test('Eze 1', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/eze_1.json').text())).toBe(
				MetadataSchema.Eze
			);
		});

		test('Eze 2', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/eze_2.json').text())).toBe(
				MetadataSchema.Eze
			);
		});

		test('Eze 3', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/eze_3.json').text())).toBe(
				MetadataSchema.Eze
			);
		});

		test('Eze (ExHentai) 1', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/eze_sad_1.json').text())).toBe(
				MetadataSchema.EzeSad
			);
		});

		test('Eze (ExHentai) 2', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/eze_sad_2.json').text())).toBe(
				MetadataSchema.EzeSad
			);
		});

		test('Gallery-DL 1', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/gallery-dl_1.json').text())).toBe(
				MetadataSchema.GalleryDL
			);
		});

		test('Gallery-DL 2', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/gallery-dl_2.json').text())).toBe(
				MetadataSchema.GalleryDL
			);
		});

		test('Gallery-DL 3', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/gallery-dl_3.json').text())).toBe(
				MetadataSchema.GalleryDL
			);
		});

		test('Gallery-DL 4', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/gallery-dl_4.json').text())).toBe(
				MetadataSchema.GalleryDL
			);
		});

		test('Gallery-DL 5', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/gallery-dl_5.json').text())).toBe(
				MetadataSchema.GalleryDL
			);
		});

		test('HenTag 1', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/hentag_1.json').text())).toBe(
				MetadataSchema.HenTag
			);
		});

		test('HenTag 2', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/hentag_2.json').text())).toBe(
				MetadataSchema.HenTag
			);
		});

		test('HenTag 3', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/hentag_3.json').text())).toBe(
				MetadataSchema.HenTag
			);
		});

		test('Koromo 1', async () => {
			expect(getJsonSchema(await Bun.file(__dirname + '/resources/koromo_1.json').text())).toBe(
				MetadataSchema.Koromo
			);
		});
	});

	describe('Embedded metadata', () => {
		test('Anchira 1', async () => {
			const zip = readZip(__dirname + '/resources/anchira_1.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'Kairakuten Heroines 2020-07 - Azuma',
				slug: 'kairakuten-heroines-2020-07-azuma',
				released_at: dayjs.unix(1591776007).toDate(),
				artists: ['Akashi Rokuro'],
				circles: [],
				parodies: ['Original Work'],
				magazines: ['Comic Kairakuten 2020-07'],
				tags: [
					['Color', ''],
					['Ecchi', ''],
					['Illustration', ''],
					['Loli', ''],
					['Unlimited', ''],
				],
				thumbnail: 1,
				sources: [
					{
						url: 'https://www.fakku.net/hentai/kairakuten-heroines-2020-07-azuma-english',
						name: 'FAKKU',
					},
					{
						url: 'https://anchira.to/g/5864/a42b1ad09002',
						name: 'Anchira',
					},
				],
				has_metadata: true,
			});
		});

		test('Anchira 2', async () => {
			const zip = readZip(__dirname + '/resources/anchira_2.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'My Ideal Life in Another World Vol. 9',
				slug: 'my-ideal-life-in-another-world-vol-9',
				released_at: dayjs.unix(1677890580).toDate(),
				artists: ['Ichiri'],
				circles: ['23.4do'],
				parodies: ['Original Work'],
				magazines: [],
				tags: [
					['Busty', ''],
					['Catgirl', ''],
					['Creampie', ''],
					['Doujin', ''],
					['Exhibitionism', ''],
					['Hentai', ''],
					['Masturbation', ''],
					['Stockings', ''],
					['Uncensored', ''],
				],
				thumbnail: 1,
				sources: [
					{
						url: 'https://www.fakku.net/hentai/my-ideal-life-in-another-world-vol-9-english',
						name: 'FAKKU',
					},
					{
						url: 'https://anchira.to/g/11417/c3ff35fc7202',
						name: 'Anchira',
					},
				],
				has_metadata: true,
			});
		});

		test('Anchira 3', async () => {
			const zip = readZip(__dirname + '/resources/anchira_3.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'My Elf Maid Has a Sharp Tongue But She Begrudgingly Let Me Hit It After I Groveled',
				slug: 'my-elf-maid-has-a-sharp-tongue-but-she-begrudgingly-let-me-hit-it-after-i-groveled',
				artists: ['35 Machi'],
				circles: [],
				parodies: ['Original Work'],
				magazines: ['Isekairakuten Vol.30'],
				tags: [
					['Blowjob', ''],
					['Busty', ''],
					['Creampie', ''],
					['Elf', ''],
					['Fantasy', ''],
					['Hentai', ''],
					['Inverted Nipples', ''],
					['Light Hair', ''],
					['Maid', ''],
					['Over-Eye Bangs', ''],
					['Pubic Hair', ''],
					['Stockings', ''],
					['Uncensored', ''],
					['Unlimited', ''],
					['Vanilla', ''],
					['Very Long Hair', ''],
					['X-ray', ''],
				],
				thumbnail: 2,
				sources: [
					{
						url: 'https://anchira.to/g/13098/06a64c794766',
						name: 'Anchira',
					},
				],
				has_metadata: true,
			});
		});

		test('CCDC06 1', async () => {
			const zip = readZip(__dirname + '/resources/ccdc06_1.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'Bavel Pin-Up Girls #230',
				slug: 'bavel-pin-up-girls-230',
				released_at: dayjs.unix(1724180407).toDate(),
				artists: ['Pyon-Kti'],
				magazines: ['Comic Bavel 2024-08'],
				publishers: ['FAKKU'],
				parodies: ['Original Work'],
				tags: [
					['Unlimited', ''],
					['Ecchi', ''],
					['Fangs', ''],
					['Females Only', ''],
					['Full Color', ''],
					['Group', ''],
					['Huge Boobs', ''],
					['Illustration', ''],
					['Kimono', ''],
					['Light Hair', ''],
					['Pubic Hair', ''],
					['Short Hair', ''],
					['Socks', ''],
					['Uncensored', ''],
					['Very Long Hair', ''],
				],
				thumbnail: 1,
				sources: [
					{
						url: 'https://www.fakku.net/hentai/bavel-pin-up-girls-230-english',
						name: 'FAKKU',
					},
				],
				has_metadata: true,
			});
		});

		test('CCDC06 2', async () => {
			const zip = readZip(__dirname + '/resources/ccdc06_2.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'Huge Little Sis, Tiny Big Bro 2',
				slug: 'huge-little-sis-tiny-big-bro-2',
				artists: ['Binto'],
				circles: ['Akaeboshi'],
				tags: [
					['Ahegao', ''],
					['Anal', ''],
					['Big Penis', ''],
					['Blowjob', ''],
					['Busty', ''],
					['Crossdressing', ''],
					['Deepthroat', ''],
					['Femdom', ''],
					['Forbidden', ''],
					['Futanari', ''],
					['Incest', ''],
					['Lingerie', ''],
					['Tomgirl', ''],
					['Uncensored', ''],
					['X-ray', ''],
				],
				thumbnail: 1,
				sources: [
					{
						url: 'https://fakku.net/hentai/huge-little-sis-tiny-big-bro-2-english',
						name: 'FAKKU',
					},
					{
						url: 'https://koharu.to/g/13620/3c8837a383f9',
						name: 'Koharu',
					},
				],
				images: [
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p001 [x3200] [Irodori Comics].png',
						page_number: 1,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p002 [x3200] [Irodori Comics].png',
						page_number: 2,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p003 [x3200] [Irodori Comics].png',
						page_number: 3,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p004 [x3200] [Irodori Comics].png',
						page_number: 4,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p005 [x3200] [Irodori Comics].png',
						page_number: 5,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p006 [x3200] [Irodori Comics].png',
						page_number: 6,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p007 [x3200] [Irodori Comics].png',
						page_number: 7,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p008 [x3200] [Irodori Comics].png',
						page_number: 8,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p009 [x3200] [Irodori Comics].png',
						page_number: 9,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p010 [x3200] [Irodori Comics].png',
						page_number: 10,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p011 [x3200] [Irodori Comics].png',
						page_number: 11,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p012 [x3200] [Irodori Comics].png',
						page_number: 12,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p013 [x3200] [Irodori Comics].png',
						page_number: 13,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p014 [x3200] [Irodori Comics].png',
						page_number: 14,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p015 [x3200] [Irodori Comics].png',
						page_number: 15,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p016 [x3200] [Irodori Comics].png',
						page_number: 16,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p017 [x3200] [Irodori Comics].png',
						page_number: 17,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p018 [x3200] [Irodori Comics].png',
						page_number: 18,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p019 [x3200] [Irodori Comics].png',
						page_number: 19,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p020 [x3200] [Irodori Comics].png',
						page_number: 20,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p021 [x3200] [Irodori Comics].png',
						page_number: 21,
					},
					{
						filename:
							'[Akaeboshi (Binto)] Huge Little Sis, Tiny Big Bro 2 - p022 [x3200] [Irodori Comics].png',
						page_number: 22,
					},
				],
				has_metadata: true,
			});
		});

		test('Koharu 1', async () => {
			const zip = readZip(__dirname + '/resources/koharu_1.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'Couple Channel',
				slug: 'couple-channel',
				language: 'English',
				artists: ['Ariyoshi Gen'],
				magazines: ['Comic Bavel 2024-07'],
				tags: [
					['Blowjob', ''],
					['Filming', ''],
					['Pubic Hair', ''],
					['X-Ray', ''],
					['Busty', 'female'],
					['Condom', 'male'],
					['Uncensored', 'other'],
					['Vanilla', 'other'],
				],
				sources: [
					{
						url: 'https://koharu.to/g/14239/c4f745671e5a',
						name: 'Koharu',
					},
				],
				has_metadata: true,
			});
		});

		test('Koromo 1', async () => {
			const zip = readZip(__dirname + '/resources/koromo_1.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'X-Eros Girls Collection #114: Tsunonigau',
				slug: 'x-eros-girls-collection-114-tsunonigau',
				released_at: dayjs.unix(1724727600).toDate(),
				artists: ['Tsunonigau'],
				magazines: ['Comic X-Eros #114'],
				parodies: ['Original Work'],
				publishers: ['FAKKU'],
				tags: [
					['Bun Hair', ''],
					['Full Color', ''],
					['Illustration', ''],
					['Light Hair', ''],
					['Petite', ''],
					['Uncensored', ''],
					['Unlimited', ''],
				],
				sources: [{ name: 'HentaiNexus', url: 'https://hentainexus.com/view/17363' }],
				has_metadata: true,
			});
		});

		test('Koromo 2', async () => {
			const zip = readZip(__dirname + '/resources/koromo_2.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'Drenched Indecent Girls Collection',
				slug: 'drenched-indecent-girls-collection',
				artists: [
					'Coupe',
					'Hinasaki Yo',
					'Kizuka Kazuki',
					'Migihaji',
					'Nekomata Naomi',
					'Nicoby',
					'Pennel',
					'Shibaken Gorou',
					'Tsukako',
					'Uranokyuu',
					'Yamaishi Juhachi',
				],
				magazines: ['Comic Kairakuten BEAST 2022-08'],
				parodies: ['Original Work'],
				publishers: ['FAKKU'],
				released_at: dayjs.unix(1657854000).toDate(),
				tags: [
					['Beach', ''],
					['Beauty Mark', ''],
					['Busty', ''],
					['Hentai', ''],
					['Illustration', ''],
					['Light Hair', ''],
					['Milf', ''],
					['Piercing', ''],
					['Ponytail', ''],
					['Pool', ''],
					['Pubic Hair', ''],
					['Schoolgirl Outfit', ''],
					['Short Hair', ''],
					['Socks', ''],
					['Swimsuit', ''],
					['Twintails', ''],
					['Uncensored', ''],
					['Unlimited', ''],
				],
				sources: [{ name: 'HentaiNexus', url: 'https://hentainexus.com/view/12853' }],
				has_metadata: true,
			});
		});

		test('Koromo 3', async () => {
			const zip = readZip(__dirname + '/resources/koromo_3.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: `Dosukebe Roman's Travelogue ~Drenched Arc~`,
				slug: 'dosukebe-romans-travelogue-drenched-arc',
				description: 'Suspenseful, smutty reference-gathering!!',
				artists: ['Hitori'],
				magazines: ['Comic Kairakuten BEAST 2022-09'],
				parodies: ['Original Work'],
				publishers: ['FAKKU'],
				released_at: dayjs.unix(1668740400).toDate(),
				tags: [
					['Curly Hair', ''],
					['Ecchi', ''],
					['Fangs', ''],
					['Milf', ''],
					['Monster Girl', ''],
					['Squirting', ''],
					['Unlimited', ''],
				],
				thumbnail: 2,
				sources: [{ name: 'HentaiNexus', url: 'https://hentainexus.com/view/13515' }],
				has_metadata: true,
			});
		});

		test('Koromo 4', async () => {
			const zip = readZip(__dirname + '/resources/koromo_4.cbz');
			const archive: Archive = {};

			expect(addEmbeddedMetadata(zip, archive).then((r) => r[0])).resolves.toEqual({
				title: 'The Dick Pub Volume 1',
				slug: 'the-dick-pub-volume-1',
				description: 'Lewd Service, hospitality in the form of erect penises… Why is it so good!?',
				artists: ['Hiroyoshi Kira'],
				circles: ['WWWave'],
				parodies: ['Original Work'],
				publishers: ['MediBang!'],
				released_at: dayjs.unix(1625886000).toDate(),
				tags: [
					['Big Dick', ''],
					['Color', ''],
					['Cunnilingus', ''],
					['Doujin', ''],
					['Fingering', ''],
					['Hentai', ''],
					['Ongoing', ''],
					['Osananajimi', ''],
					['Uncensored', ''],
					['Webtoon', ''],
				],
				sources: [{ name: 'HentaiNexus', url: 'https://hentainexus.com/view/10781' }],
				has_metadata: true,
			});
		});
	});

	describe('External metadata', () => {
		test('Booru 1', async () => {
			const archive: Archive = {};

			expect(addExternalMetadata(__dirname + '/resources/gelbooru.cbz', archive)).resolves.toEqual([
				{
					tags: [
						['Gofelem', ''],
						['Lene (Fire Emblem)', ''],
						['Fire Emblem', ''],
						['Fire Emblem: Genealogy Of The Holy War', ''],
						['Fire Emblem Cipher', ''],
						['Fire Emblem Heroes', ''],
						['Nintendo', ''],
						['Commission', ''],
						['1girl', ''],
						[':D', ''],
						['Artist Name', ''],
						['Bare Shoulders', ''],
						['Bow', ''],
						['Breasts', ''],
						['Cleavage', ''],
						['Dancer', ''],
						['Detached Sleeves', ''],
						['Earrings', ''],
						['Gem', ''],
						['Green Eyes', ''],
						['Green Hair', ''],
						['Hair Between Eyes', ''],
						['Hair Bow', ''],
						['Jewelry', ''],
						['Large Breasts', ''],
						['Nose', ''],
						['Official Alternate Costume', ''],
						['Open Mouth', ''],
						['Pendant', ''],
						['Pink Bow', ''],
						['Ponytail', ''],
						['Simple Background', ''],
						['Smile', ''],
						['Solo', ''],
						['Teeth', ''],
						['Upper Body', ''],
						['White Background', ''],
					],
				},
				[MetadataSchema.Booru, MetadataFormat.TXT],
			]);
		});
	});
});
