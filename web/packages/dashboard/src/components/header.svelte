<script lang="ts">
	import { Button, Search } from 'shared';
	import { replace } from 'svelte-spa-router';
	import IonMdHome from '~icons/ion/md-home';
	import { searchParams } from '../lib/stores';

	const onSearch = (event: any) => {
		searchParams.setParams({ query: event.detail.query, page: 1 });
		replace('/');
	};
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

	<Search query={$searchParams.query} on:search={onSearch} class="h-12 w-full flex-1 p-2" />
</div>
