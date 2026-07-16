<script lang="ts">
	import { cn } from '$lib/utils';

	let className: string | null | undefined = undefined;

	export let name: string | undefined = undefined;
	export { className as class };
</script>

<div class={cn('bg-neutral-800 p-3 odd:bg-neutral-900', className)}>
	{#if name}
		<p class="pb-1 text-xs font-medium uppercase tracking-wide">{name}</p>
	{/if}

	<slot />
</div>
