<script lang="ts">
	import Search from '$lib/components/search.svelte';
	import { Button } from '$ui/button';
	import { replace } from 'svelte-spa-router';
	import IonMdHome from '~icons/ion/md-home';
	import { searchParams } from '../stores';

	const onSearch = (event: CustomEvent<{ query: string }>) => {
		searchParams.setParams({ query: event.detail.query, page: 1 });
		replace('/');
	};
</script>

<div class="fixed z-20 flex h-fit w-full border-b bg-background shadow dark:border-border">
	<Button
		href="/"
		title="Go home"
		variant="ghost"
		class="size-12 rounded-none p-0 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 hover:dark:text-primary"
		on:click={(ev) => {
			ev.preventDefault();
			searchParams.reset();
		}}
	>
		<IonMdHome class="size-6" />
	</Button>

	<Search query={$searchParams.query} on:search={onSearch} class="h-12 w-full flex-1 p-2" />
</div>
