import { $ } from 'bun';
import { readdir } from 'node:fs/promises';

const folders = [
	'anchira.to_1-1000',
	'anchira.to_1001-2000',
	'anchira.to_2001-3000',
	'anchira.to_3001-4000',
	'anchira.to_4001-5000',
	'anchira.to_5001-6000',
	'anchira.to_6001-7000',
	'anchira.to_7001-8000',
	'anchira.to_8001-9000',
	'anchira.to_9001-10000',
	'anchira.to_10001-11000',
	'anchira.to_11001-12000',
	'anchira.to_12001-13000',
	'anchira.to_13001-14000',
	'hentainexus.com_1-17000',
];

for (const folder of folders) {
	const files = (await readdir(`/Volumes/Hentai/` + folder)).slice(0, 10);

	for (const file of files) {
		await $`rsync -av --mkpath /Volumes/Hentai/${folder}/${file} /Users/fermin/Desktop/faccina/content/${folder}/${file}`;
	}
}
