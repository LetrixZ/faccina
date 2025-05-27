import dayjs from 'dayjs';
import arraySupport from 'dayjs/plugin/arraySupport';
import { parseStringPromise } from 'xml2js';
import { z } from 'zod';
import config from '../../shared/config';
import { type ArchiveMetadata } from '../../shared/metadata';
import { parseFilename } from './utils';

dayjs.extend(arraySupport);

const metadataSchema = z
	.object({
		ComicInfo: z.object({
			Title: z.string(),
			Notes: z
				.string()
				.transform((val) => val.split('\n'))
				.optional(),
			Writer: z
				.string()
				.transform((val) => val.split(','))
				.optional(),
			Tags: z
				.string()
				.transform((val) => val.split(','))
				.optional(),
			Web: z
				.string()
				.transform((val) => val.split(','))
				.optional(),
			LanguageISO: z.string().optional(),
			Year: z.coerce.number().optional(),
			Month: z.coerce.number().optional(),
			Day: z.coerce.number().optional(),
		}),
	})
	.transform((val) => val.ComicInfo)
	.transform((val) => ({
		...val,
		Released: (() => {
			if (!val.Year || !val.Month || !val.Day) {
				return undefined;
			}

			return dayjs(`${val.Year}-${val.Month}-${val.Day}`, 'YYYY-MM-DD').toDate();
		})(),
	}));

export default async (content: string, archive: ArchiveMetadata) => {
	const parsed = await parseStringPromise(content, { explicitArray: false });
	const { data, error } = metadataSchema.safeParse(parsed);

	if (!data) {
		throw new Error(`Failed to parse ComicInfo metadata: ${error}`);
	}

	archive = structuredClone(archive);

	if (config.metadata?.parseFilenameAsTitle) {
		archive.title = parseFilename(data.Title)[0] ?? data.Title;
	} else {
		archive.title = data.Title;
	}

	archive.language = isoTable.find((lang) => lang.code === data.LanguageISO)?.language;
	archive.releasedAt = data.Released;

	archive.tags = [];

	if (data.Writer) {
		const circles = data.Writer.filter((val) => val.includes(' (Circle)'));
		const artists = data.Writer.filter((val) => !circles.includes(val));

		archive.tags.push(...artists.map((tag) => ({ namespace: 'artist', name: tag })));
		archive.tags.push(
			...circles.map((tag) => ({ namespace: 'circle', name: tag.replace(' (Circle)', '') }))
		);
	}

	if (data.Tags) {
		archive.tags.push(...data.Tags.map((tag) => ({ namespace: 'tag', name: tag })));
	}

	const sources = new Set<string>();

	data.Notes?.forEach((source) => sources.add(source));
	data.Web?.forEach((url) => sources.add(url));

	archive.sources = Array.from(sources.values()).map((url) => ({ url }));

	return archive;
};

const isoTable = [
	{ language: 'Abkhazian', code: 'ab' },
	{ language: 'Afar', code: 'aa' },
	{ language: 'Afrikaans', code: 'af' },
	{ language: 'Akan', code: 'ak' },
	{ language: 'Albanian', code: 'sq' },
	{ language: 'Amharic', code: 'am' },
	{ language: 'Arabic', code: 'ar' },
	{ language: 'Aragonese', code: 'an' },
	{ language: 'Armenian', code: 'hy' },
	{ language: 'Assamese', code: 'as' },
	{ language: 'Avaric', code: 'av' },
	{ language: 'Avestan', code: 'ae' },
	{ language: 'Aymara', code: 'ay' },
	{ language: 'Azerbaijani', code: 'az' },
	{ language: 'Bambara', code: 'bm' },
	{ language: 'Bashkir', code: 'ba' },
	{ language: 'Basque', code: 'eu' },
	{ language: 'Belarusian', code: 'be' },
	{ language: 'Bengali', code: 'bn' },
	{ language: 'Bislama', code: 'bi' },
	{ language: 'Bosnian', code: 'bs' },
	{ language: 'Breton', code: 'br' },
	{ language: 'Bulgarian', code: 'bg' },
	{ language: 'Burmese', code: 'my' },
	{ language: 'Catalan, Valencian', code: 'ca' },
	{ language: 'Chamorro', code: 'ch' },
	{ language: 'Chechen', code: 'ce' },
	{ language: 'Chichewa, Chewa, Nyanja', code: 'ny' },
	{ language: 'Chinese', code: 'zh' },
	{ language: 'Church Slavonic, Old Slavonic, Old Church Slavonic', code: 'cu' },
	{ language: 'Chuvash', code: 'cv' },
	{ language: 'Cornish', code: 'kw' },
	{ language: 'Corsican', code: 'co' },
	{ language: 'Cree', code: 'cr' },
	{ language: 'Croatian', code: 'hr' },
	{ language: 'Czech', code: 'cs' },
	{ language: 'Danish', code: 'da' },
	{ language: 'Divehi, Dhivehi, Maldivian', code: 'dv' },
	{ language: 'Dutch, Flemish', code: 'nl' },
	{ language: 'Dzongkha', code: 'dz' },
	{ language: 'English', code: 'en' },
	{ language: 'Esperanto', code: 'eo' },
	{ language: 'Estonian', code: 'et' },
	{ language: 'Ewe', code: 'ee' },
	{ language: 'Faroese', code: 'fo' },
	{ language: 'Fijian', code: 'fj' },
	{ language: 'Finnish', code: 'fi' },
	{ language: 'French', code: 'fr' },
	{ language: 'Western Frisian', code: 'fy' },
	{ language: 'Fulah', code: 'ff' },
	{ language: 'Gaelic, Scottish Gaelic', code: 'gd' },
	{ language: 'Galician', code: 'gl' },
	{ language: 'Ganda', code: 'lg' },
	{ language: 'Georgian', code: 'ka' },
	{ language: 'German', code: 'de' },
	{ language: 'Greek, Modern (1453–)', code: 'el' },
	{ language: 'Kalaallisut, Greenlandic', code: 'kl' },
	{ language: 'Guarani', code: 'gn' },
	{ language: 'Gujarati', code: 'gu' },
	{ language: 'Haitian, Haitian Creole', code: 'ht' },
	{ language: 'Hausa', code: 'ha' },
	{ language: 'Hebrew', code: 'he' },
	{ language: 'Herero', code: 'hz' },
	{ language: 'Hindi', code: 'hi' },
	{ language: 'Hiri Motu', code: 'ho' },
	{ language: 'Hungarian', code: 'hu' },
	{ language: 'Icelandic', code: 'is' },
	{ language: 'Ido', code: 'io' },
	{ language: 'Igbo', code: 'ig' },
	{ language: 'Indonesian', code: 'id' },
	{ language: 'Interlingua (International Auxiliary Language Association)', code: 'ia' },
	{ language: 'Interlingue, Occidental', code: 'ie' },
	{ language: 'Inuktitut', code: 'iu' },
	{ language: 'Inupiaq', code: 'ik' },
	{ language: 'Irish', code: 'ga' },
	{ language: 'Italian', code: 'it' },
	{ language: 'Japanese', code: 'ja' },
	{ language: 'Javanese', code: 'jv' },
	{ language: 'Kannada', code: 'kn' },
	{ language: 'Kanuri', code: 'kr' },
	{ language: 'Kashmiri', code: 'ks' },
	{ language: 'Kazakh', code: 'kk' },
	{ language: 'Central Khmer', code: 'km' },
	{ language: 'Kikuyu, Gikuyu', code: 'ki' },
	{ language: 'Kinyarwanda', code: 'rw' },
	{ language: 'Kirghiz, Kyrgyz', code: 'ky' },
	{ language: 'Komi', code: 'kv' },
	{ language: 'Kongo', code: 'kg' },
	{ language: 'Korean', code: 'ko' },
	{ language: 'Kuanyama, Kwanyama', code: 'kj' },
	{ language: 'Kurdish', code: 'ku' },
	{ language: 'Lao', code: 'lo' },
	{ language: 'Latin', code: 'la' },
	{ language: 'Latvian', code: 'lv' },
	{ language: 'Limburgan, Limburger, Limburgish', code: 'li' },
	{ language: 'Lingala', code: 'ln' },
	{ language: 'Lithuanian', code: 'lt' },
	{ language: 'Luba-Katanga', code: 'lu' },
	{ language: 'Luxembourgish, Letzeburgesch', code: 'lb' },
	{ language: 'Macedonian', code: 'mk' },
	{ language: 'Malagasy', code: 'mg' },
	{ language: 'Malay', code: 'ms' },
	{ language: 'Malayalam', code: 'ml' },
	{ language: 'Maltese', code: 'mt' },
	{ language: 'Manx', code: 'gv' },
	{ language: 'Maori', code: 'mi' },
	{ language: 'Marathi', code: 'mr' },
	{ language: 'Marshallese', code: 'mh' },
	{ language: 'Mongolian', code: 'mn' },
	{ language: 'Nauru', code: 'na' },
	{ language: 'Navajo, Navaho', code: 'nv' },
	{ language: 'North Ndebele', code: 'nd' },
	{ language: 'South Ndebele', code: 'nr' },
	{ language: 'Ndonga', code: 'ng' },
	{ language: 'Nepali', code: 'ne' },
	{ language: 'Norwegian', code: 'no' },
	{ language: 'Norwegian Bokmål', code: 'nb' },
	{ language: 'Norwegian Nynorsk', code: 'nn' },
	{ language: 'Occitan', code: 'oc' },
	{ language: 'Ojibwa', code: 'oj' },
	{ language: 'Oriya', code: 'or' },
	{ language: 'Oromo', code: 'om' },
	{ language: 'Ossetian, Ossetic', code: 'os' },
	{ language: 'Pali', code: 'pi' },
	{ language: 'Pashto, Pushto', code: 'ps' },
	{ language: 'Persian', code: 'fa' },
	{ language: 'Polish', code: 'pl' },
	{ language: 'Portuguese', code: 'pt' },
	{ language: 'Punjabi, Panjabi', code: 'pa' },
	{ language: 'Quechua', code: 'qu' },
	{ language: 'Romanian, Moldavian, Moldovan', code: 'ro' },
	{ language: 'Romansh', code: 'rm' },
	{ language: 'Rundi', code: 'rn' },
	{ language: 'Russian', code: 'ru' },
	{ language: 'Northern Sami', code: 'se' },
	{ language: 'Samoan', code: 'sm' },
	{ language: 'Sango', code: 'sg' },
	{ language: 'Sanskrit', code: 'sa' },
	{ language: 'Sardinian', code: 'sc' },
	{ language: 'Serbian', code: 'sr' },
	{ language: 'Shona', code: 'sn' },
	{ language: 'Sindhi', code: 'sd' },
	{ language: 'Sinhala, Sinhalese', code: 'si' },
	{ language: 'Slovak', code: 'sk' },
	{ language: 'Slovenian', code: 'sl' },
	{ language: 'Somali', code: 'so' },
	{ language: 'Southern Sotho', code: 'st' },
	{ language: 'Spanish, Castilian', code: 'es' },
	{ language: 'Sundanese', code: 'su' },
	{ language: 'Swahili', code: 'sw' },
	{ language: 'Swati', code: 'ss' },
	{ language: 'Swedish', code: 'sv' },
	{ language: 'Tagalog', code: 'tl' },
	{ language: 'Tahitian', code: 'ty' },
	{ language: 'Tajik', code: 'tg' },
	{ language: 'Tamil', code: 'ta' },
	{ language: 'Tatar', code: 'tt' },
	{ language: 'Telugu', code: 'te' },
	{ language: 'Thai', code: 'th' },
	{ language: 'Tibetan', code: 'bo' },
	{ language: 'Tigrinya', code: 'ti' },
	{ language: 'Tonga (Tonga Islands)', code: 'to' },
	{ language: 'Tsonga', code: 'ts' },
	{ language: 'Tswana', code: 'tn' },
	{ language: 'Turkish', code: 'tr' },
	{ language: 'Turkmen', code: 'tk' },
	{ language: 'Twi', code: 'tw' },
	{ language: 'Uighur, Uyghur', code: 'ug' },
	{ language: 'Ukrainian', code: 'uk' },
	{ language: 'Urdu', code: 'ur' },
	{ language: 'Uzbek', code: 'uz' },
	{ language: 'Venda', code: 've' },
	{ language: 'Vietnamese', code: 'vi' },
	{ language: 'Volapük', code: 'vo' },
	{ language: 'Walloon', code: 'wa' },
	{ language: 'Welsh', code: 'cy' },
	{ language: 'Wolof', code: 'wo' },
	{ language: 'Xhosa', code: 'xh' },
	{ language: 'Sichuan Yi, Nuosu\\n', code: 'ii\\n' },
	{ language: 'Yiddish', code: 'yi' },
	{ language: 'Yoruba', code: 'yo' },
	{ language: 'Zhuang, Chuang', code: 'za' },
	{ language: 'Zulu', code: 'zu' },
];
