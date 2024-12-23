<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import type { FormValue } from '$lib/types';
	import { StreamLanguage } from '@codemirror/language';
	import { toml as tomlLang } from '@codemirror/legacy-modes/mode/toml';
	import { tokyoNight } from '@ddietr/codemirror-themes/tokyo-night';
	import {
		databaseSchema,
		directoriesSchema,
		orderOptions,
		serverSchema,
		siteSchema,
		sortOptions
	} from 'shared/config.schema';
	import TOML from 'smol-toml';
	import { onMount, untrack } from 'svelte';
	import CodeMirror from 'svelte-codemirror-editor';
	import { slide } from 'svelte/transition';
	import { z } from 'zod';
	import { fromError } from 'zod-validation-error';

	const configSchema = z.object({
		directories: directoriesSchema,
		database: databaseSchema,
		server: serverSchema.default({}),
		site: siteSchema.default({})
	});

	let value = $state('');

	let form = $state<FormValue>({
		directories: {
			content: './content',
			images: './images'
		},
		database: {
			vendor: 'sqlite',
			path: './db.sqlite',
			database: 'faccina',
			user: 'faccina',
			password: 'faccina',
			host: '127.0.0.1',
			port: 5432
		},
		server: {
			logging: true,
			auto_unpack: false
		},
		site: {
			site_name: 'Faccina',
			url: undefined,
			enable_users: true,
			enable_collections: true,
			enable_read_history: true,
			admin_users: [],
			default_sort: 'released_at',
			default_order: 'desc',
			guest_downloads: true,
			client_side_downloads: true,
			search_placeholder: '',
			store_og_images: false,
			secure_session_cookie: true
		}
	});

	let parsedToml = $derived.by(() => {
		try {
			return { success: true, data: TOML.parse(value) };
		} catch (error) {
			console.error(error);

			if (error instanceof Error) {
				return { success: false, error: error.message };
			}

			return { success: false, error: 'Unknown error' };
		}
	});

	let parsedEditorConfig = $derived(configSchema.safeParse(parsedToml.data));

	let parsedFormConfig = $derived(configSchema.safeParse(form));

	let tomlFormConfig = $derived.by(() => {
		try {
			if (parsedFormConfig.error) {
				console.error(parsedFormConfig.error);
				return { success: false, error: parsedFormConfig.error.message };
			}

			return { success: true, data: TOML.stringify(parsedFormConfig.data) };
		} catch (error) {
			console.error(error);

			if (error instanceof Error) {
				return { success: false, error: error.message };
			}

			return { success: false, error: 'Unknown error' };
		}
	});

	$effect(() => {
		if (tomlFormConfig.data) {
			value = tomlFormConfig.data;
		}
	});

	let isMounted = $state(false);

	onMount(() => {
		isMounted = true;
	});

	const databaseTypeOptions = [
		{ value: 'sqlite', label: 'SQLite' },
		{ value: 'postgresql', label: 'PostgreSQL' }
	];

	let selectedDatabaseType = $state(databaseTypeOptions[0]);

	let selectedSortType = $state(sortOptions[0]);
	let selectedOrderType = $state(orderOptions[0]);

	let adminUserList = $state('');

	$effect(() => {
		form.database.vendor = selectedDatabaseType.value;
		form.site.default_sort = selectedSortType.value;
		form.site.default_order = selectedOrderType.value;
		form.site.admin_users = adminUserList.trim().length
			? adminUserList.split(',').map((s) => s.trim())
			: [];
	});

	const applyCodeChange = () => {
		if (parsedEditorConfig.error) {
			return;
		}

		const {
			data: { directories, database, server, site }
		} = parsedEditorConfig;

		form.directories = directories;
		form.database.vendor = database.vendor;

		if (database.vendor === 'sqlite') {
			form.database.path = database.path;
		} else {
			form.database.database = database.database;
			form.database.user = database.user;
			form.database.password = database.password;
			form.database.host = database.host;
			form.database.port = database.port;
		}

		form.server.logging = server.logging;
		form.server.auto_unpack = server.auto_unpack;

		form.site.site_name = site.site_name;
		form.site.url = site.url;
		form.site.enable_users = site.enable_users;
		form.site.enable_collections = site.enable_collections;
		form.site.enable_read_history = site.enable_read_history;
		form.site.admin_users = site.admin_users;
		form.site.default_sort = site.default_sort;
		form.site.default_order = site.default_order;
		form.site.guest_downloads = site.guest_downloads;
		form.site.client_side_downloads = site.client_side_downloads;
		form.site.search_placeholder = site.search_placeholder;
		form.site.store_og_images = site.store_og_images;
		form.site.secure_session_cookie = site.secure_session_cookie;

		selectedSortType = sortOptions.find((option) => option.value === site.default_sort)!;
		selectedOrderType = orderOptions.find((option) => option.value === site.default_order)!;
		selectedDatabaseType = databaseTypeOptions.find((option) => option.value === database.vendor)!;
		adminUserList = site.admin_users.join(', ');
	};
</script>

<div>
	{#if value.length && parsedFormConfig.error}
		<div
			transition:slide
			class="mb-2 whitespace-pre-line rounded bg-destructive px-2 py-1 text-sm text-destructive-foreground"
		>
			<p class="!my-0 font-semibold">Invalid configuration</p>
			{fromError(parsedFormConfig.error, {
				issueSeparator: '\n',
				prefix: null
			})}
		</div>
	{/if}

	<div class="space-y-4">
		<h3 id="directories"><a href="#directories"> Directories </a></h3>

		<div class="rounded-lg border border-input p-4">
			<div class="grid grid-cols-2 gap-3">
				<div class="flex w-full flex-col gap-1.5">
					<Label for="content-directory">Content path</Label>
					<Input id="content-directory" bind:value={form.directories.content} />
				</div>
				<div class="flex w-full flex-col gap-1.5">
					<Label for="images-directory">Images path</Label>
					<Input id="images-directory" bind:value={form.directories.images} />
				</div>
			</div>
		</div>

		<h3 id="database">
			<a href="#database"> Database </a>
		</h3>

		<div class="rounded-lg border border-input p-4">
			<div class="grid grid-cols-2 gap-3">
				<div class="flex w-full flex-col gap-1.5">
					<Label for="db-type">Database type</Label>
					<Select.Root bind:selected={selectedDatabaseType} items={databaseTypeOptions}>
						<Select.Trigger class="w-full" id="db-type">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="sqlite">SQLite</Select.Item>
							<Select.Item value="postgresql">PostgreSQL</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				{#if form.database.vendor === 'sqlite'}
					<div class="flex w-full flex-col gap-1.5">
						<Label for="db-path">Database path</Label>
						<Input id="db-path" bind:value={form.database.path} />
					</div>
				{:else}
					<div class="flex w-full flex-col gap-1.5">
						<Label for="db-name">Database name</Label>
						<Input id="db-name" bind:value={form.database.database} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="db-name">Username</Label>
						<Input id="db-name" bind:value={form.database.user} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="db-name">Password</Label>
						<Input id="db-name" bind:value={form.database.password} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="db-host">Host</Label>
						<Input id="db-host" bind:value={form.database.host} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="db-port">Port</Label>
						<Input id="db-port" type="number" bind:value={form.database.port} min="0" max="65535" />
					</div>
				{/if}
			</div>
		</div>

		<h3 id="server">
			<a href="#server"> Server </a>
		</h3>

		<div class="rounded-lg border border-input p-4">
			<div class="grid grid-cols-2 gap-3">
				<div class="grid gap-3">
					<div class="flex items-center space-x-2">
						<Switch
							id="logging"
							checked={typeof form.server.logging === 'boolean'
								? form.server.logging
								: form.server.logging.length > 0}
							onCheckedChange={(checked) => (form.server.logging = checked)}
						/>
						<Label for="logging">Request logging</Label>
					</div>

					<div class="flex items-center space-x-2">
						<Switch id="auto-unpack" bind:checked={form.server.auto_unpack} />
						<Label for="auto-unpack">Auto unpack images</Label>
					</div>
				</div>

				<div class="flex w-full flex-col gap-1.5">
					<Label for="logfile">Log filepath</Label>
					<Input
						id="logfile"
						oninput={(event) => {
							const path = event.currentTarget.value;

							if (path.length) {
								form.server.logging = path;
							} else {
								form.server.logging = true;
							}
						}}
					/>
					<p class="!my-0 text-muted-foreground">Leave blank to not save logs to disk</p>
				</div>
			</div>
		</div>

		<h3 id="site">
			<a href="#site"> Site </a>
		</h3>

		<div class="rounded-lg border border-input p-4">
			<div class="grid grid-cols-2 gap-3">
				<div class="grid gap-3">
					<div class="flex w-full flex-col gap-1.5">
						<Label for="site-name">Site name</Label>
						<Input id="site-name" bind:value={form.site.site_name} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="site-url">URL</Label>
						<Input id="site-url" bind:value={form.site.url} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="placeholder">Search placeholder</Label>
						<Input id="placeholder" bind:value={form.site.search_placeholder} />
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="sort-type">Default sort type</Label>
						<Select.Root bind:selected={selectedSortType} items={sortOptions}>
							<Select.Trigger class="w-full" id="sort-type">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								{#each sortOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex w-full flex-col gap-1.5">
						<Label for="order-type">Default order type</Label>
						<Select.Root bind:selected={selectedOrderType} items={orderOptions}>
							<Select.Trigger class="w-full" id="order-type">
								<Select.Value />
							</Select.Trigger>
							<Select.Content>
								{#each orderOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<div class="grid gap-3">
					<div class="flex items-center space-x-2">
						<Switch id="users" bind:checked={form.site.enable_users} />
						<Label for="users">Enable users</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Switch id="collections" bind:checked={form.site.enable_collections} />
						<Label for="collections">Enable collections</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Switch id="read-history" bind:checked={form.site.enable_read_history} />
						<Label for="read-history">Enable read history</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Switch id="guest-downloads" bind:checked={form.site.guest_downloads} />
						<Label for="guest-downloads">Enable guest downloads</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Switch id="client-downloads" bind:checked={form.site.client_side_downloads} />
						<Label for="client-downloads">Enable client-side downloads</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Switch id="store-og" bind:checked={form.site.store_og_images} />
						<Label for="store-og">Save OpenGraph image to disk</Label>
					</div>
					<div class="flex items-center space-x-2">
						<Switch id="secure-cookie" bind:checked={form.site.secure_session_cookie} />
						<Label for="secure-cookie">Use secure session cookie</Label>
					</div>
				</div>

				<div class="col-span-2 flex w-full flex-col gap-1.5">
					<Label for="admins">Admin users</Label>
					<Input id="admins" bind:value={adminUserList} />
					<p class="!my-0 text-muted-foreground">
						Comma separated list of usernames to apply admin to
					</p>
				</div>
			</div>
		</div>

		<!-- {#if value.length} -->
		{#if parsedToml.error}
			<div
				transition:slide
				class="mb-2 rounded bg-destructive px-2 py-1 text-sm text-destructive-foreground"
			>
				<p class="!my-0 font-semibold">Invalid TOML</p>
				{parsedToml.error}
			</div>
		{:else if value.length && parsedEditorConfig.error}
			<div
				transition:slide
				class="mb-2 whitespace-pre-line rounded bg-destructive px-2 py-1 text-sm text-destructive-foreground"
			>
				<p class="!my-0 font-semibold">Invalid configuration</p>
				{fromError(parsedEditorConfig.error, {
					issueSeparator: '\n',
					prefix: null
				})}
			</div>
			<!-- {/if} -->
		{/if}

		{#if isMounted}
			<CodeMirror
				bind:value
				on:change={applyCodeChange}
				extensions={[StreamLanguage.define(tomlLang)]}
				theme={tokyoNight}
				class="overflow-auto rounded-lg"
			/>
		{/if}
	</div>
</div>
