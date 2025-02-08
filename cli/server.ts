import { writeFile } from '~shared/server.utils';

export const heapSnapshot = async ({ hostname, port }: { hostname: string; port: string }) => {
	const res = await fetch(`http://${hostname ?? '127.0.0.1'}:${port || 55884}/heap-snapshot`);

	if (!res.ok) {
		throw new Error(
			`An error ocurred while fetching internal server: ${res.status} - ${res.statusText}`
		);
	}

	const heap = await res.text();
	await writeFile(`heap-snapshot.${new Date().toISOString()}.json`, heap);
};

export const heapStats = async ({ hostname, port }: { hostname: string; port: string }) => {
	const res = await fetch(`http://${hostname ?? '127.0.0.1'}:${port || 55884}/heap-stats`);

	if (!res.ok) {
		throw new Error(
			`An error ocurred while fetching internal server: ${res.status} - ${res.statusText}`
		);
	}

	const heap = await res.text();
	await writeFile(`heap-stats.${new Date().toISOString()}.json`, heap);
};

export const runGC = async ({
	sync,
	hostname,
	port,
}: {
	sync: boolean;
	hostname: string;
	port: string;
}) => {
	const res = await fetch(
		`http://${hostname ?? '127.0.0.1'}:${port || 55884}/gc?sync=${sync ? '1' : '0'}`
	);

	if (!res.ok) {
		throw new Error(
			`An error ocurred while fetching internal server: ${res.status} - ${res.statusText}`
		);
	}
};
