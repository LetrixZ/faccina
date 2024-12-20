<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import '../app.pcss';

	let { children, data } = $props();
</script>

<div class="container mx-auto flex w-full gap-3 space-y-3 p-3 ps-44">
	<aside class="fixed start-4 w-40 flex-col space-y-3">
		<a href="{base}/" class="text-xl font-semibold">Faccina</a>

		<div class="flex flex-col gap-y-4 text-nowrap rounded">
			{#each data.sections as section}
				<div class="space-y-1">
					<p class="text-sm">{section.title}</p>
					<div class="flex flex-col gap-1 text-muted-foreground">
						{#each section.pages as docPage}
							{@const active = page.url.pathname.includes(docPage.url)}
							<a
								href={docPage.url}
								class={cn('text-sm hover:underline', active && 'text-indigo-400')}
							>
								{docPage.name}
							</a>
							{#if docPage.subpages.length}
								<div class="ps-1.5">
									{#each docPage.subpages as subpage}
										{@const active = page.url.pathname.includes(subpage.url)}
										<a
											href={subpage.url}
											class={cn('text-sm hover:underline', active && 'text-indigo-300')}
										>
											{subpage.name}
										</a>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</aside>

	<div class="flex-auto lg:max-w-screen-lg">
		{@render children()}
	</div>
</div>
