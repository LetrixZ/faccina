<script lang="ts">
	import pixelWidth from 'string-pixel-width';
	import type { Gallery, Tag, TagNamespace } from '$lib/types';
	import { cn, isTag } from '$lib/utils';

	interface Props {
		gallery: Gallery;
		dataURL: string;
		imageHeight: number;
		imageWidth: number;
	}

	let {
		gallery,
		dataURL,
		imageHeight,
		imageWidth
	}: Props = $props();

	const truncatedTitle = () => {
		const aux = [];

		let addEllipsis = false;

		for (let i = 0; i <= gallery.title.length; i++) {
			const stringWidth = pixelWidth(aux.join(''), { font: 'inter', size: 32 });
			const lines = stringWidth / 376;

			if (lines > 3) {
				addEllipsis = true;

				break;
			}

			aux.push(gallery.title[i]);
		}

		return `${aux.join('')}${addEllipsis ? '&hellip;' : ''}`;
	};

	let [reducedTags, moreCount] = $derived((() => {
		const maxWidth = 750;

		const tags = [
			...gallery.tags.filter((tag) => tag.namespace === 'artist'),
			...gallery.tags.filter((tag) => tag.namespace === 'circle'),
			...gallery.tags.filter((tag) => tag.namespace === 'parody'),
			...gallery.tags.filter((tag) => isTag(tag)),
		];

		let tagCount = tags.length;
		let width = 0;

		const reduced: Tag[] = [];

		for (const tag of tags) {
			if (reduced.find((t) => t.name === tag.name)) {
				continue;
			}

			if (tag.namespace === 'tag' && tag.name.length > 20) {
				continue;
			}

			if (width < maxWidth) {
				const tagWidth = 12 + pixelWidth(tag.name, { font: 'inter', size: 12 });

				width += tagWidth;
				reduced.push(tag);
				tagCount--;
			}
		}

		return [reduced, tagCount];
	})());

	const getBackground = (namespace: TagNamespace) => {
		switch (namespace) {
			case 'artist':
				return 'bg-red-700 hover:bg-red-700/80';
			case 'circle':
				return 'bg-orange-700 hover:bg-orange-700/80';
			case 'magazine':
				return 'bg-blue-700 hover:bg-blue-700/80';
			case 'event':
				return 'bg-rose-700 hover:bg-blue-700/80';
			case 'publisher':
				return 'bg-sky-700 hover:bg-sky-700/80';
			case 'parody':
				return 'bg-indigo-700 hover:bg-indigo-700/80';
			case 'tag':
				return 'bg-neutral-700 hover:bg-neutral-700/80';
		}
	};
</script>

<div tw="bg-[#0A0A0A] flex flex-col w-full h-full text-white">
	<!-- svelte-ignore a11y_missing_attribute -->
	<img
		src={dataURL}
		style="filter: blur(40px) brightness(0.2)"
		tw="rounded-md absolute h-full w-full inset-0 m-auto"
	/>
	<div tw="flex flex-auto p-4">
		<!-- svelte-ignore a11y_missing_attribute -->
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
							getBackground(tag.namespace)
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
