<script lang="ts">
	import { cn, encodeURL } from '$lib/utils';
	import type { Tag } from '../types';
	import { Button } from './ui/button';

	type Props = {
		tag: Tag;
		newTab?: boolean;
	};

	let { tag, newTab = false }: Props = $props();

	const classes = (() => {
		switch (tag.namespace) {
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

	const url = $derived(
		`/?q=${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${encodeURL(tag.name)}"` : encodeURL(tag.name)}`.toLowerCase()
	);
</script>

<Button
	class={cn(
		'h-fit w-fit px-1.5 py-0.5 text-sm font-medium text-neutral-50 dark:text-neutral-100',
		classes
	)}
	href={url}
	variant="secondary"
	{...newTab && { target: '_blank' }}
>
	{label}
</Button>
