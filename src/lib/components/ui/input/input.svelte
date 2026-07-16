<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:files
		bind:this={ref}
		bind:value
		class={cn(
			'aria-invalid:ring-destructive/40 aria-invalid:border-destructive/50 shadow-xs focus-visible:ring-3 aria-invalid:ring-3 h-9 w-full min-w-0 rounded-md border border-input bg-input/30 px-2.5 py-1 text-base outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className
		)}
		data-slot={dataSlot}
		type="file"
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		bind:value
		class={cn(
			'aria-invalid:ring-destructive/40 aria-invalid:border-destructive/50 shadow-xs focus-visible:ring-3 aria-invalid:ring-3 h-9 w-full min-w-0 rounded-md border border-input bg-input/30  px-2.5 py-1 text-base outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
			className
		)}
		data-slot={dataSlot}
		{type}
		{...restProps}
	/>
{/if}
