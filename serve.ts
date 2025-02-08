import { generateHeapSnapshot } from 'bun';
import { heapStats } from 'bun:jsc';
import serve from './build';

serve();

Bun.serve({
	hostname: '127.0.0.1',
	port: process.env.INTERNAL_PORT || 55884,
	async fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === '/heap-snapshot') {
			const snapshot = generateHeapSnapshot();
			console.debug(`Generating heap snapshot`);
			return new Response(JSON.stringify(snapshot, null, 2));
		} else if (url.pathname === '/heap-stats') {
			const stats = heapStats();
			console.debug(`Collecting heap stats`);
			return new Response(JSON.stringify(stats, null, 2));
		} else if (url.pathname === '/gc') {
			const sync = url.searchParams.get('sync') === '1';
			console.debug(`Running garbage collector. Sync? ${sync ? 'yes' : 'no'}`);
			Bun.gc(sync);
			return new Response('OK');
		}

		return new Response('Faccina');
	},
});
