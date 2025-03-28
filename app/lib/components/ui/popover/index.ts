import Content from './popover-content.svelte';
import { Popover as PopoverPrimitive } from 'bits-ui';

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;
const Close = PopoverPrimitive.Close;
const Portal = PopoverPrimitive.Portal;

export {
	Close,
	Content,
	//
	Root as Popover,
	Close as PopoverClose,
	Content as PopoverContent,
	Trigger as PopoverTrigger,
	Portal,
	Root,
	Trigger,
};
