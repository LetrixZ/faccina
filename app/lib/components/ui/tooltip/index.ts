import Content from './tooltip-content.svelte';
import { Tooltip as TooltipPrimitive } from 'bits-ui';

const Root = TooltipPrimitive.Root;
const Trigger = TooltipPrimitive.Trigger;
const Provider = TooltipPrimitive.Provider;

export {
	Content,
	Provider,
	Root,
	//
	Root as Tooltip,
	Content as TooltipContent,
	Provider as TooltipProvider,
	Trigger as TooltipTrigger,
	Trigger,
};
