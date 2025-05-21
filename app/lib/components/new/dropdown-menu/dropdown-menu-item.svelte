<script lang="ts">
	import { cn } from '$lib/utils';
	import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
	import type { IconProps } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type Props = {
		text: string;
		icon: Component<IconProps, object, ''>;
		href?: string;
		onclick?: MouseEventHandler<HTMLDivElement> | null;
	} & DropdownMenuPrimitive.ItemProps;

	let {
		text,
		href,
		onclick,
		icon: Icon,
		ref = $bindable(null),
		class: className,
		...restProps
	}: Props = $props();

	const actionClass =
		'item flex min-h-6.5 cursor-pointer items-center gap-4 rounded-lg px-1.5 text-sm font-medium justify-between';
</script>

{#snippet content()}
	<span>{text}</span>
	<Icon class="size-4" />
{/snippet}

<DropdownMenuPrimitive.Item {onclick} {...restProps} bind:ref>
	{#snippet child({ props })}
		{#if href}
			<a class={cn('item', actionClass, className)} {href} {...props}>
				{@render content()}
			</a>
		{:else}
			<button class={cn('item', actionClass, className)} {...props}>
				{@render content()}
			</button>
		{/if}
	{/snippet}
</DropdownMenuPrimitive.Item>

<style>
	.item[data-highlighted] {
		background-color: color-mix(in oklab, var(--color-neutral-600) 80%, var(--color-accent));
	}
</style>
