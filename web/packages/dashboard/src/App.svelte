<script>
	import { Toaster } from 'shared/components/ui/sonner';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import Home from './routes/home.svelte';
	import GalleryDetail from './routes/gallery-detail.svelte';
	import Router from 'svelte-spa-router';

	const queryClient = new QueryClient();

	const routes = {
		'/': Home,
		'/g/:id': GalleryDetail
	};
</script>

<Toaster richColors position="top-right" />

<QueryClientProvider client={queryClient}>
	<Router {routes} />
</QueryClientProvider>
