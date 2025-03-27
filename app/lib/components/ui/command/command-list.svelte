<script lang="ts">
	import { Command as CommandPrimitive } from 'cmdk-sv';
	import { cn } from '$lib/utils.js';

	type $$Props = CommandPrimitive.ListProps;
	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<CommandPrimitive.List
	class={cn('max-h-[300px] overflow-x-hidden overflow-y-auto', className)}
	{...$$restProps}
>
	<slot />
</CommandPrimitive.List>
