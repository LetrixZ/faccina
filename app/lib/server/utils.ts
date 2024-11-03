import type { GalleryListItem, Tag } from '../types';
import config from '~shared/config';

export const handleTags = (archive: GalleryListItem): GalleryListItem => {
	const { tagExclude, tagWeight } = config.site.galleryListing;

	const filteredTags = archive.tags.filter((tag) => {
		return !tagExclude.some(({ ignoreCase, name, namespace }) => {
			const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
			const normalizedNames = ignoreCase ? name.map((t) => t.toLowerCase()) : name;

			if (namespace) {
				return namespace === tag.namespace && normalizedNames.includes(normalizedTagName);
			} else {
				return normalizedNames.includes(normalizedTagName);
			}
		});
	});

	const sortedTags = filteredTags.sort((a, b) => {
		const getWeight = (tag: Tag) => {
			const matchTag = tagWeight.find(({ ignoreCase, name, namespace }) => {
				const normalizedTagName = ignoreCase ? tag.name.toLowerCase() : tag.name;
				const normalizedNames = ignoreCase ? name.map((t) => t.toLowerCase()) : name;

				if (namespace) {
					return namespace === tag.namespace && normalizedNames.includes(normalizedTagName);
				} else {
					return normalizedNames.includes(normalizedTagName);
				}
			});

			return matchTag?.weight ?? 0;
		};

		const aWeight = getWeight(a);
		const bWeight = getWeight(b);

		return aWeight === bWeight ? a.name.localeCompare(b.name) : bWeight - aWeight;
	});

	archive.tags = sortedTags;

	return archive;
};
