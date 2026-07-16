<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { cn } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...props
	}: ComponentProps<typeof Input> = $props();
</script>

<Input
	bind:ref
	bind:value
	class={cn(
		'aria-invalid:ring-0 flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0',
		className
	)}
	data-slot="input-group-control"
	{...props}
/>
