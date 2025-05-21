<script lang="ts">
	import { cn } from '$lib/utils';
	import { type ButtonRootProps } from 'bits-ui';
	import type { IconProps } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		class?: ClassValue;
		color?: 'neutral' | 'green' | 'blue' | 'indigo' | 'red' | 'sky' | 'orange';
		centered?: boolean;
		icon?: Component<IconProps, object, ''>;
		iconSide?: 'start' | 'end';
		iconClass?: ClassValue | null;
		labelClass?: ClassValue | null;
	} & ButtonRootProps;

	let {
		color = 'neutral',
		centered = false,
		icon: Icon,
		iconSide = 'end',
		class: className,
		iconClass,
		labelClass,
		href,
		type,
		disabled,
		children,
		...restProps
	}: Props = $props();
</script>

{#snippet icon()}
	{#if Icon}
		<Icon class={cn('p-0.5', iconClass)} />
	{/if}
{/snippet}

<svelte:element
	this={href ? 'a' : 'button'}
	class={cn(
		'btn relative flex min-h-9 items-center rounded-2xl border px-2 text-sm font-medium',
		color,
		!centered && 'justify-between gap-2',
		className
	)}
	aria-disabled={href ? disabled : undefined}
	disabled={href ? undefined : disabled}
	href={href && !disabled ? href : undefined}
	role={href && disabled ? 'link' : undefined}
	tabindex={href && disabled ? -1 : 0}
	type={href ? undefined : type}
	{...restProps}
>
	{#if iconSide === 'start'}
		{@render icon()}
	{/if}

	{#if children}
		<span class={cn(centered && 'grow px-2', labelClass)}>{@render children?.()}</span>
	{/if}

	{#if iconSide === 'end'}
		{@render icon()}
	{/if}
</svelte:element>

<style>
	@layer base {
		a,
		button {
			--alpha: 40%;
			transition:
				background-color 100ms ease,
				border-color 100ms ease,
				scale 75ms;

			@media (prefers-reduced-motion: reduce) {
				transition: none;
			}

			background-color: --alpha(
				color-mix(in oklab, var(--background-color) var(--mix-ratio), var(--color-accent)) /
					var(--alpha)
			);
			border-color: --alpha(
				color-mix(in oklab, var(--border-color) var(--mix-ratio), var(--color-accent)) /
					var(--alpha)
			);

			&:hover {
				@media (hover: hover) {
					--alpha: 60%;
				}
			}

			&:active {
				scale: 0.9875;
			}
		}

		a.neutral,
		button.neutral {
			--mix-ratio: 80%;
			--background-color: var(--color-neutral-800);
			--border-color: var(--color-neutral-700);
		}

		a.green,
		button.green {
			--mix-ratio: 90%;
			--background-color: var(--color-green-600);
			--border-color: var(--color-green-500);
		}

		a.blue,
		button.blue {
			--mix-ratio: 90%;
			--background-color: var(--color-blue-800);
			--border-color: var(--color-blue-700);
		}

		a.sky,
		button.sky {
			--mix-ratio: 90%;
			--background-color: var(--color-sky-800);
			--border-color: var(--color-sky-700);
		}

		a.indigo,
		button.indigo {
			--mix-ratio: 90%;
			--background-color: var(--color-indigo-800);
			--border-color: var(--color-indigo-700);
		}

		a.orange,
		button.orange {
			--mix-ratio: 90%;
			--background-color: var(--color-orange-800);
			--border-color: var(--color-orange-700);
		}

		a.red,
		button.red {
			--mix-ratio: 90%;
			--background-color: var(--color-red-800);
			--border-color: var(--color-red-700);
		}
	}
</style>
