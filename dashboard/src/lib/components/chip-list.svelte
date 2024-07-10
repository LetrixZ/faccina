<script lang="ts">
	import { TagType, type Taxonomy } from '../models';
	import { cn, encodeURL } from '$lib/utils';
	import { Button } from '$ui/button';

	export let item: Taxonomy;
	export let type: TagType;
	export let onClick: (() => void) | undefined = undefined;

	const classes = (() => {
		switch (type) {
			case TagType.ARTIST:
				return 'bg-red-700 hover:bg-red-700/80';
			case TagType.CIRCLE:
				return 'bg-orange-700 hover:bg-orange-700/80';
			case TagType.MAGAZINE:
				return 'bg-blue-700 hover:bg-blue-700/80';
			case TagType.EVENT:
				return 'bg-rose-700 hover:bg-blue-700/80';
			case TagType.PUBLISHER:
				return 'bg-sky-700 hover:bg-sky-700/80';
			case TagType.PARODY:
				return 'bg-indigo-700 hover:bg-indigo-700/80';
			case TagType.TAG:
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
	on:click={(event) => {
		if (onClick) {
			event.preventDefault();
			onClick();
		}
	}}
>
	{item.name}
</Button>
