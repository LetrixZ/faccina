<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import '../app.pcss';

	let { children, data } = $props();
</script>

<div class="mx-auto flex w-full max-w-screen-lg gap-3 space-y-3 px-3 pt-12">
	<aside class="fixed w-52 flex-col space-y-3 overflow-hidden">
		<a href="{base}/" class="text-xl font-semibold">Faccina</a>

		<div class="flex flex-col gap-y-4 text-nowrap rounded">
			{#each data.sections as section}
				<div class="space-y-1">
					<p class="text-sm">{section.title}</p>
					<ul class="flex flex-col text-muted-foreground">
						{#each section.pages as docPage}
							{@const active = page.url.pathname.includes(docPage.url)}
							{@const exactMatch = page.url.pathname == docPage.url}
							<li>
								<a
									href={docPage.url}
									class={cn(
										'text-sm underline-offset-2 hover:underline',
										active && 'text-indigo-400'
									)}
								>
									{docPage.name}
								</a>
								{#if docPage.subpages.length}
									<div class="ps-1.5">
										{#each docPage.subpages as subpage}
											{@const active = page.url.pathname.includes(subpage.url)}
											{@const exactMatch = page.url.pathname == subpage.url}
											<a
												href={subpage.url}
												class={cn(
													'text-sm underline-offset-2 hover:underline',
													active && 'text-indigo-300'
												)}
											>
												{subpage.name}
											</a>
										{/each}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</aside>

	<div class="ms-52 flex-auto">
		{@render children()}
	</div>
</div>
