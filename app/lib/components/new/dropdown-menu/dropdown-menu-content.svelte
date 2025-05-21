<script lang="ts">
	import { cn, flyAndScale } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		sideOffset = 4,
		portalProps,
		class: className,
		children,
		...restProps
	}: DropdownMenuPrimitive.ContentProps & {
		portalProps?: DropdownMenuPrimitive.PortalProps;
	} = $props();
</script>

<DropdownMenuPrimitive.Portal {...portalProps}>
	<DropdownMenuPrimitive.Content
		align="end"
		forceMount
		preventScroll={false}
		side="bottom"
		{sideOffset}
		{...restProps}
		bind:ref
	>
		{#snippet child({ wrapperProps, props, open })}
			{#if open}
				<div {...wrapperProps}>
					<div
						{...props}
						class={cn(
							'content flex min-w-40 flex-col rounded-lg p-1 shadow-md backdrop-blur-md outline-none',
							className
						)}
						transition:flyAndScale
					>
						{@render children?.()}
					</div>
				</div>
			{/if}
		{/snippet}
	</DropdownMenuPrimitive.Content>
</DropdownMenuPrimitive.Portal>

<style>
	.content {
		--alpha: 40%;
		--mix-ratio: 80%;
		--background-color: var(--color-neutral-800);
		--border-color: var(--color-neutral-700);

		background-color: color-mix(in oklab, var(--color-neutral-800) 80%, var(--color-accent));
	}
</style>
