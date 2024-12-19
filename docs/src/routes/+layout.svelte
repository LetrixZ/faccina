<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import '../app.pcss';

	let { children, data } = $props();
</script>

<div class="py- container mx-auto w-full gap-3 space-y-3 p-3 md:flex">
	<div class="flex flex-col gap-y-3 text-nowrap rounded bg-muted p-2 md:min-w-40 md:bg-transparent">
		{#each data.sections as section}
			<div class="space-y-1">
				<p class="text-sm font-semibold">{section.title}</p>
				<div class="flex flex-col gap-1 text-muted-foreground">
					{#each section.pages as docPage}
						{@const active = page.url.pathname.includes(docPage.url)}
						<a
							href={docPage.url}
							class={cn('text-sm hover:underline', active && 'text-foreground')}
						>
							{docPage.name}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="flex-auto lg:max-w-screen-lg">
		{@render children()}
	</div>
</div>
