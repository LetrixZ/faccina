<script lang="ts">
	import { page } from '$app/stores';
	import { cn } from '$lib/utils';
	import { Button, Input } from 'shared';
	import IonMdHome from '~icons/ion/md-home';
	import PhMagnifyingGlass from '~icons/ph/magnifying-glass';

	$: query = $page.url.searchParams.get('q') ?? '';
	$: sort = $page.url.searchParams.get('sort');
	$: order = $page.url.searchParams.get('order');
</script>

<div class="bg-background dark:border-border fixed z-20 flex h-fit w-full border-b shadow">
	<Button
		href="/"
		title="Go home"
		variant="ghost"
		class="text-muted-foreground hover:dark:text-primary size-12 rounded-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
	>
		<IonMdHome class="size-6" />
	</Button>

	<div class="h-12 w-full flex-1 p-2">
		<form
			action="/"
			class="bg-muted ring-offset-background focus-within:ring-ring hover:ring-ring flex h-full w-full items-center rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 hover:ring-2 hover:ring-offset-2"
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
				class="text-muted-foreground focus-within:text-foreground aspect-square h-full rounded-none p-0 !ring-0 !ring-offset-0"
			>
				<span class="sr-only">Search</span>
				<PhMagnifyingGlass />
			</Button>
		</form>
	</div>
</div>

<div class={cn('pt-12')}>
	<slot />
</div>
