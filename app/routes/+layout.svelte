<script>
	import { Toaster } from '$lib/components/ui/sonner';
	import { appState } from '$lib/stores';
	import '../app.pcss';

	const { data, children } = $props();

	$effect(() => {
		appState.siteConfig = data.site;
		appState.user = data.user;
	});
</script>

{@render children()}

<Toaster position="bottom-center" richColors />
