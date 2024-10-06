<script lang="ts">
	import pixelWidth from 'string-pixel-width';

	import { type ArchiveDetail, TagType, type Taxonomy } from '~/lib/models';
	import { cn, tagsExcludeCount, tagsExcludeDisplay, tagWeights } from '~/lib/utils';

	export let archive: ArchiveDetail;
	export let dataURL: string;
	export let imageHeight: number;
	export let imageWidth: number;

	const truncatedTitle = () => {
		const aux = [];

		let addEllipsis = false;

		for (let i = 0; i <= archive.title.length; i++) {
			const stringWidth = pixelWidth(aux.join(''), { font: 'inter', size: 32 });
			const lines = stringWidth / 376;

			if (lines > 3) {
				addEllipsis = true;

				break;
			}

			aux.push(archive.title[i]);
		}

		return `${aux.join('')}${addEllipsis ? '&hellip;' : ''}`;
	};

	$: [reducedTags, moreCount] = (() => {
		const maxWidth = 376 * 2;

		const tags = [
			...(archive.artists ? archive.artists.map((tag) => ({ ...tag, type: TagType.ARTIST })) : []),
			...(archive.circles ? archive.circles.map((tag) => ({ ...tag, type: TagType.CIRCLE })) : []),
			...(archive.parodies
				? archive.parodies
						.map((tag) => ({ ...tag, type: TagType.PARODY }))
						.filter((tag) => !['original-work', 'original'].includes(tag.slug))
				: []),
			...(archive.tags
				? archive.tags
						.map((tag) => ({ ...tag, type: TagType.TAG }))
						.filter((tag) => !tagsExcludeCount.includes(tag.name.toLowerCase()))
						.sort((a, b) => {
							const aWeight = tagWeights.find(([tag]) => tag === a.name.toLowerCase())?.[1] ?? 0;
							const bWeight = tagWeights.find(([tag]) => tag === b.name.toLowerCase())?.[1] ?? 0;

							if (aWeight === bWeight) {
								return a.name.length - b.name.length;
							}

							return bWeight - aWeight;
						})
				: []),
		];

		let tagCount = tags.length;
		let width = 0;

		const reduced: (Taxonomy & { type: TagType })[] = [];

		for (const tag of tags) {
			if (reduced.find((t) => t.name === tag.name)) {
				continue;
			}

			if (tag.type === TagType.CIRCLE && tag.name.length > 20) {
				continue;
			}

			if (width < maxWidth) {
				const tagWidth = 12 + pixelWidth(tag.name, { font: 'inter', size: 12 });

				if (tag.type === TagType.TAG && tagsExcludeDisplay.includes(tag.name.toLowerCase())) {
					continue;
				}

				width += tagWidth;
				reduced.push(tag);
				tagCount--;
			}
		}

		return [reduced, tagCount];
	})();

	const getBackground = (type: TagType) => {
		switch (type) {
			case TagType.ARTIST:
				return 'bg-red-700';
			case TagType.CIRCLE:
				return 'bg-orange-700';
			case TagType.MAGAZINE:
				return 'bg-blue-700';
			case TagType.PARODY:
				return 'bg-indigo-700';
			case TagType.TAG:
				return 'bg-neutral-700';
		}
	};
</script>

<div tw="bg-[#0A0A0A] flex flex-col w-full h-full text-white">
	<!-- svelte-ignore a11y-missing-attribute -->
	<img
		src={dataURL}
		style="filter: blur(40px) brightness(0.2)"
		tw="rounded-md absolute h-full w-full inset-0 m-auto"
	/>
	<div tw="flex flex-auto p-4">
		<!-- svelte-ignore a11y-missing-attribute -->
		<img height={imageHeight} src={dataURL} tw="rounded-md" width={imageWidth} />
		<div tw="flex ml-4 flex-auto flex-col">
			<span style="font-size: 32px" tw="font-bold flex-shrink-0 mb-1">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html truncatedTitle()}
			</span>
			<div style="margin-left: -0.175rem;" tw="flex flex-wrap">
				{#each reducedTags as tag}
					<span
						style="margin: 0.175rem"
						tw={cn(
							'px-1.5 py-0.5 rounded-md text-sm font-semibold text-neutral-200',
							getBackground(tag.type)
						)}
					>
						{tag.name}
					</span>
				{/each}
				{#if moreCount}
					<span
						style="margin: 0.175rem"
						tw={cn(
							'px-1.5 py-0.5 rounded-md text-sm font-semibold text-neutral-200 bg-neutral-800'
						)}
					>
						+{moreCount}
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>
