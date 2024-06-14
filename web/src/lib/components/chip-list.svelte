<script lang="ts">
	import type { Tag, TagType } from '$lib/models';
	import { cn, encodeURL } from '$lib/utils';
	import { Button } from './ui/button';

	export let item: Tag;
	export let type: TagType;

	const classes = (() => {
		switch (type) {
			case 'artist':
				return 'bg-red-700 hover:bg-red-700/80';
			case 'circle':
				return 'bg-orange-700 hover:bg-orange-700/80';
			case 'magazine':
				return 'bg-blue-700 hover:bg-blue-700/80';
			case 'parody':
				return 'bg-indigo-700 hover:bg-indigo-700/80';
			case 'tag':
				return 'bg-neutral-700 hover:bg-neutral-700/80';
		}
	})();
</script>

<Button
	href={`/?q=${type}:'${encodeURL(item.name).toLowerCase()}'`}
	class={cn(
		'h-fit w-fit px-1.5 py-0.5 text-xs font-medium text-neutral-50 dark:text-neutral-200',
		classes
	)}
	variant="secondary"
>
	{item.name}
</Button>
