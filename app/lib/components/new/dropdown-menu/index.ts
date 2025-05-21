import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
import Content from './dropdown-menu-content.svelte';
import Item from './dropdown-menu-item.svelte';
import Separator from './dropdown-menu-separator.svelte';

const Sub = DropdownMenuPrimitive.Sub;
const Root = DropdownMenuPrimitive.Root;
const Trigger = DropdownMenuPrimitive.Trigger;
const Group = DropdownMenuPrimitive.Group;
const RadioGroup = DropdownMenuPrimitive.RadioGroup;

export {
	Content,
	Root as DropdownMenu,
	Content as DropdownMenuContent,
	Group as DropdownMenuGroup,
	Item as DropdownMenuItem,
	RadioGroup as DropdownMenuRadioGroup,
	Separator as DropdownMenuSeparator,
	Sub as DropdownMenuSub,
	Trigger as DropdownMenuTrigger,
	Group,
	Item,
	RadioGroup,
	Root,
	Separator,
	Sub,
	Trigger,
};
