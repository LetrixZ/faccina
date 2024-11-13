<script lang="ts">
	import { cn } from '$lib/utils';


	interface Props {
		class?: string | null | undefined;
		name?: string | undefined;
		children?: import('svelte').Snippet;
	}

	let { class: className = undefined, name = undefined, children }: Props = $props();
	
</script>

<div
	class={cn(
		'bg-neutral-200 p-3 odd:bg-neutral-100 dark:bg-neutral-800 odd:dark:bg-neutral-900',
		className
	)}
>
	{#if name}
		<p class="pb-1 text-xs font-medium uppercase tracking-wide">{name}</p>
	{/if}

	{@render children?.()}
</div>
