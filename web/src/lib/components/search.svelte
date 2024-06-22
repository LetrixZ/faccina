<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import PhMagnifyingGlass from '~icons/ph/magnifying-glass';
	import Button from './ui/button/button.svelte';
	import { Input } from './ui/input';

	let className: string | null | undefined = undefined;

	$: query = $page.url.searchParams.get('q') ?? '';

	export { className as class };
</script>

<div class={cn(className)}>
	<form class="grid">
		<div
			class="flex h-full rounded-md bg-neutral-700/30 ring-offset-background focus-within:outline-none focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-1 hover:ring-1 hover:ring-ring"
		>
			<Input
				type="search"
				placeholder="tag:petite creampie"
				class="h-fit flex-grow border-0 bg-transparent py-2 !ring-0 !ring-offset-0"
				value={query}
				name="q"
			/>
			<Button
				type="submit"
				variant="ghost"
				class="h-full rounded-none py-0 text-muted-foreground !ring-0 !ring-offset-0 focus-within:text-white"
			>
				<PhMagnifyingGlass />
			</Button>
		</div>
	</form>
</div>
