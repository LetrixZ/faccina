<script lang="ts">
	import { cn, encodeURL } from '$lib/utils';
	import type { Tag } from '../types';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		tag: Tag;
		class?: ClassValue;
	};

	let { tag, class: className }: Props = $props();

	const classes = (() => {
		switch (tag.namespace) {
			case 'author':
			case 'artist':
				return 'bg-red-700/40 hover:bg-red-700/60';
			case 'group':
			case 'circle':
				return 'bg-orange-700/40 hover:bg-orange-700/60';
			case 'magazine':
				return 'bg-blue-700/40 hover:bg-blue-700/60';
			case 'event':
				return 'bg-rose-700/40 hover:bg-blue-700/60';
			case 'publisher':
				return 'bg-sky-700/40 hover:bg-sky-700/60';
			case 'parody':
				return 'bg-indigo-700/40 hover:bg-indigo-700/60';
			default:
				return 'bg-zinc-500/40 hover:bg-zinc-500/60';
		}
	})();

	const namespace = $derived(
		['artist', 'circle', 'magazine', 'event', 'publisher', 'parody', 'tag'].includes(tag.namespace)
			? null
			: tag.namespace
	);

	const label = $derived.by(() => {
		if (namespace) {
			return `${namespace}:${tag.name}`;
		} else {
			return tag.name;
		}
	});

	const url = $derived.by(() => {
		const params = new URLSearchParams();
		params.set(
			'q',
			`${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${encodeURL(tag.name)}"` : encodeURL(tag.name)}`.toLowerCase()
		);
		return `/?${params.toString()}`;
	});
</script>

<a
	class={cn(
		'flex rounded-2xl px-1.5 py-1 text-xs leading-3 font-semibold duration-100',
		classes,
		className
	)}
	href={url}
>
	{label}
</a>
