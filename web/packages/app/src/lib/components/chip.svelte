<script lang="ts">
	import { cn, encodeURL } from '$lib/utils';
	import { Button } from 'shared';
	import { TagType, type Tag, type Taxonomy } from 'shared/models';

	export let item: Taxonomy | Tag;
	export let type: TagType;

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

	$: queryUrl = (() => {
		if (item.name.split(':').length > 1) {
			return item.name.toLowerCase();
		} else {
			return `${type}:'${encodeURL(item.name).toLowerCase()}'`;
		}
	})();
</script>

<Button
	href={`/?q=${queryUrl}`}
	class={cn(
		'h-fit w-fit px-1.5 py-0.5 text-sm font-medium text-neutral-50 dark:text-neutral-100',
		classes
	)}
	variant="secondary"
>
	{item.name}
</Button>
