<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let { class: className, children, ...restProps }: HTMLAttributes<HTMLParagraphElement> = $props();
</script>

<p
	class={cn('text-foreground flex min-h-8 items-center text-xl font-semibold', className)}
	{...restProps}
>
	{@render children?.()}
</p>
