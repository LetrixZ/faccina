<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import type { FormValue } from '$lib/types';
	import { StreamLanguage } from '@codemirror/language';
	import { toml as tomlLang } from '@codemirror/legacy-modes/mode/toml';
	import { tokyoNight } from '@ddietr/codemirror-themes/tokyo-night';
	import { databaseSchema, directoriesSchema, serverSchema } from 'shared/config.schema';
	import TOML from 'smol-toml';
	import { onMount } from 'svelte';
	import CodeMirror from 'svelte-codemirror-editor';
	import { slide } from 'svelte/transition';
	import { z } from 'zod';
	import { fromError } from 'zod-validation-error';
	import CodeBlock from './CodeBlock.svelte';

	const configSchema = z.object({
		directories: directoriesSchema,
		database: databaseSchema,
		server: serverSchema.default({})
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

	$effect(() => {
		form.database.vendor = selectedDatabaseType.value;
	});

	const applyCodeChange = () => {
		if (parsedEditorConfig.error) {
			return;
		}

		const {
			data: { directories, database, server }
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
	};
</script>

<div>
	{#if value.length}
		{#if parsedToml.error}
			<div
				transition:slide
				class="mb-2 rounded bg-destructive px-2 py-1 text-sm text-destructive-foreground"
			>
				<p class="!my-0 font-semibold">Invalid TOML</p>
				{parsedToml.error}
			</div>
		{:else if parsedEditorConfig.error}
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
		{:else if parsedFormConfig.error}
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
	{/if}

	<div class="space-y-4">
		<h3 id="directories"><a href="#directories"> Directories </a></h3>

		<div class="rounded-lg border border-input p-4">
			<div class="grid grid-cols-2 gap-3">
				<div class="flex w-full max-w-sm flex-col gap-1.5">
					<Label for="content-directory">Content path</Label>
					<Input id="content-directory" bind:value={form.directories.content} />
				</div>

				<div class="flex w-full max-w-sm flex-col gap-1.5">
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
				<div class="flex w-full max-w-sm flex-col gap-1.5">
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
					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="db-path">Database path</Label>
						<Input id="db-path" bind:value={form.database.path} />
					</div>
				{:else}
					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="db-name">Database name</Label>
						<Input id="db-name" bind:value={form.database.database} />
					</div>

					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="db-name">Username</Label>
						<Input id="db-name" bind:value={form.database.user} />
					</div>

					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="db-name">Password</Label>
						<Input id="db-name" bind:value={form.database.password} />
					</div>

					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="db-host">Host</Label>
						<Input id="db-host" bind:value={form.database.host} />
					</div>

					<div class="flex w-full max-w-sm flex-col gap-1.5">
						<Label for="db-port">Port</Label>
						<Input id="db-port" type="number" bind:value={form.database.port} />
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

				<div class="flex w-full max-w-sm flex-col gap-1.5">
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
