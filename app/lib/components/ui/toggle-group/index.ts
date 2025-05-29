import { getContext, setContext } from 'svelte';
import Root from './toggle-group.svelte';
import Item from './toggle-group-item.svelte';
import type { toggleVariants } from '$lib/components/ui/toggle/index';
import type { VariantProps } from 'tailwind-variants';

export type ToggleVariants = VariantProps<typeof toggleVariants>;

export function setToggleGroupCtx(props: ToggleVariants) {
	setContext('toggleGroup', props);
}

export function getToggleGroupCtx() {
	return getContext<ToggleVariants>('toggleGroup');
}

export {
	Item,
	Root,
	//
	Root as ToggleGroup,
	Item as ToggleGroupItem,
};
