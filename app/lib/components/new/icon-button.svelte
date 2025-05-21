<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes;

	let { class: className, children, ...restProps }: Props = $props();
</script>

<!-- class={cn('p-1 text-button hover:text-button-hover active:text-button-active', className)} -->
<button class={cn('p-1', className)} {...restProps}>
	{@render children?.()}
</button>
