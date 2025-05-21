<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from 'bits-ui';
	import type { IconProps } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { ClassValue, HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type BaseProps = {
		class?: ClassValue;
		color?: 'neutral' | 'green' | 'blue' | 'indigo' | 'red' | 'sky' | 'orange';
		icon: Component<IconProps, object, ''>;
		iconClass?: ClassValue | null;
	};

	type AnchorProps = BaseProps & HTMLAnchorAttributes;

	type ButtonProps = BaseProps & HTMLButtonAttributes;

	type Props = AnchorProps | ButtonProps;

	let { class: className, ...restProps }: Props = $props();
</script>

<!-- <Button {...restProps} /> -->
asd
