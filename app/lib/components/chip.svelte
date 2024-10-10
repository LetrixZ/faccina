<script lang="ts">
	import { type Tag, type TagType } from '$lib/models';
	import { cn, encodeURL } from '$lib/utils';

	import { Button } from './ui/button';

	export let tag: Tag;
	export let type: TagType;

	const classes = (() => {
		switch (type) {
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

	$: label = (() => {
		if (type === 'tag' && 'namespace' in tag && tag.namespace?.length) {
			return `${tag.namespace}:${tag.name}`;
		} else {
			return tag.name;
		}
	})();

	$: url = (() => {
		if (type === 'tag' && 'namespace' in tag && tag.namespace?.length) {
			return `/?q=${tag.namespace}:${tag.name.split(' ').length > 1 ? `"${encodeURL(tag.name)}"` : encodeURL(tag.name)}`.toLowerCase();
		} else {
			return `/?q=${type}:${tag.name.split(' ').length > 1 ? `"${encodeURL(tag.name)}"` : encodeURL(tag.name)}`.toLowerCase();
		}
	})();
</script>

<Button
	class={cn(
		'h-fit w-fit px-1.5 py-0.5 text-sm font-medium text-neutral-50 dark:text-neutral-100',
		classes
	)}
	href={url}
	variant="secondary"
>
	{label}
</Button>
