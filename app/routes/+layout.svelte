<script>
	import { Toaster } from 'svelte-sonner';
	import '../app.css';

	const { children } = $props();
</script>

<main class="flex h-dvh flex-col">
	{@render children()}
</main>

<Toaster
	position="top-center"
	theme="dark"
	toastOptions={{
		unstyled: true,
		classes: {
			toast:
				'sonner flex w-full items-center gap-2 rounded-3xl px-5 py-3 text-sm font-semibold shadow shadow-muted/50 backdrop-blur-xl',
			default: 'bg-neutral-800/80',
			info: 'bg-neutral-800/80',
			success: 'border-transparent bg-green-600/60',
			warning: 'border-transparent bg-yellow-500/60',
			error: 'border-transparent bg-red-600/60',
			title: 'font-bold',
			description: 'text-sm',
		},
	}}
/>
