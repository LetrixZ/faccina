<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Command as CommandPrimitive } from 'cmdk-sv';

	type $$Props = CommandPrimitive.InputProps;

	let className: string | undefined | null = undefined;
	export { className as class };
	export let value: string = '';
</script>

<div class="flex w-full items-center border-b px-2" data-cmdk-input-wrapper="">
	<CommandPrimitive.Input
		class={cn(
			'placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		{...$$restProps}
		bind:value
	/>
</div>
