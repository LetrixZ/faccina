<script>
	import { Toaster } from '$lib/components/ui/sonner';

	import { siteConfig } from '$lib//stores';

	import '../app.pcss';

	export let data;

	$siteConfig = data.site;
</script>

<Toaster position="bottom-center" richColors />

<slot></slot>
