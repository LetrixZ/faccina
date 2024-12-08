<script>
	import { Toaster } from '$lib/components/ui/sonner';
	import { siteConfig, user } from '$lib/stores';
	import '../app.pcss';

	export let data;

	$: {
		$siteConfig = data.site;
	}

	$: {
		$user = data.user;
	}
</script>

<Toaster position="bottom-center" richColors />

<slot></slot>
