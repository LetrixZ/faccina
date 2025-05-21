<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	type Props = HTMLAnchorAttributes;

	const { children, class: classValue, ...restProps }: Props = $props();
</script>

<a class={cn(classValue, 'w-fit text-sm font-medium text-neutral-300 duration-150')} {...restProps}>
	{@render children?.()}
</a>

<style>
	a {
		background: linear-gradient(currentColor 0 0) bottom left / var(--underline-width, 0%) 0.075rem
			no-repeat;

		&:is(:where(:global(.peer)):hover ~ *),
		&:hover {
			--underline-width: 100%;
		}
	}
</style>
