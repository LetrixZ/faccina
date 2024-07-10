<script lang="ts">
	import type { Archive, Image } from '$lib/models';

	export let archive: Pick<Archive, 'title'>;
	export let cover: Pick<Image, 'width' | 'height'> | undefined;
	export let src: string;
	export let width = 640;
</script>

<img
	class="h-full w-full rounded-md bg-neutral-300 shadow-md shadow-shadow dark:bg-neutral-600"
	width={cover?.width ? width : undefined}
	height={cover?.width && cover?.height
		? Math.round((width / cover.width) * cover.height)
		: undefined}
	loading="eager"
	alt={`${archive.title} cover`}
	{src}
/>
