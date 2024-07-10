<script>
	import { Toaster } from '$ui/sonner';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import Router from 'svelte-spa-router';
	import Header from './lib/components/header.svelte';
	import GalleryDetail from './routes/gallery-detail.svelte';
	import Home from './routes/home.svelte';

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { refetchOnWindowFocus: false, retry: false },
		},
	});

	const routes = {
		'/': Home,
		'/g/:id': GalleryDetail,
	};
</script>

<Toaster richColors position="top-right" />

<QueryClientProvider client={queryClient}>
	<Header />

	<div class="pt-12">
		<Router {routes} />
	</div>
</QueryClientProvider>
