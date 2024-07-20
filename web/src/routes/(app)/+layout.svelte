<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import IonMdHome from '~icons/ion/md-home';
	import MdiSettings from '~icons/mdi/settings';
	import PhMagnifyingGlass from '~icons/ph/magnifying-glass';

	$: query = $page.url.searchParams.get('q') ?? '';
	$: sort = $page.url.searchParams.get('sort');
	$: order = $page.url.searchParams.get('order');
</script>

<div class="fixed z-20 flex h-fit w-full border-b bg-background shadow dark:border-border">
	<Button
		href="/"
		title="Go home"
		variant="ghost"
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
	>
		<IonMdHome class="size-6" />
	</Button>

	<div class="h-12 w-full flex-1 p-2">
		<form
			action="/"
			class="flex h-full w-full items-center rounded-md bg-muted ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:ring-2 hover:ring-ring hover:ring-offset-2"
		>
			<Input
				type="search"
				placeholder="tag:petite creampie"
				class="h-fit flex-grow border-0 bg-transparent py-2 !ring-0 !ring-offset-0"
				value={query}
				name="q"
			/>

			{#if sort}
				<input name="sort" value={sort} class="hidden" />
			{/if}

			{#if order}
				<input name="order" value={order} class="hidden" />
			{/if}

			<Button
				type="submit"
				variant="ghost"
				class="aspect-square h-full rounded-none p-0 text-muted-foreground !ring-0 !ring-offset-0 focus-within:text-foreground"
			>
				<span class="sr-only">Search</span>
				<PhMagnifyingGlass />
			</Button>
		</form>
	</div>

	<Button
		href="/preferences"
		title="Preferences"
		variant="ghost"
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
	>
		<MdiSettings class="size-6" />
	</Button>
</div>

<div class={cn('pt-12')}>
	<slot />
</div>
