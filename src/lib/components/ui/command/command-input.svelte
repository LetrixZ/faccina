<script lang="ts">
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import { cn } from '$lib/utils.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { Command as CommandPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		...restProps
	}: CommandPrimitive.InputProps = $props();
</script>

<div class="p-1 pb-0" data-slot="command-input-wrapper">
	<InputGroup.Root
		class="bg-input/30 border-input/30 h-8! rounded-lg! shadow-none! *:data-[slot=input-group-addon]:pl-2!"
	>
		<CommandPrimitive.Input
			class={cn(
				'w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			data-slot="command-input"
			{value}
			{...restProps}
		>
			{#snippet child({ props })}
				<InputGroup.Input {...props} bind:ref bind:value />
			{/snippet}
		</CommandPrimitive.Input>
		<InputGroup.Addon>
			<SearchIcon class="size-4 shrink-0 opacity-50" />
		</InputGroup.Addon>
	</InputGroup.Root>
</div>
