import { toast } from 'shared/components/ui/sonner';
import type { ArchiveData, ScrapeSite, UpdateArchive } from 'shared/models';

export const updateArchive = async (
	archive: UpdateArchive,
	callback?: (archive: ArchiveData) => void
) => {
	try {
		const res = await fetch('/archive', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(archive)
		});

		if (res.ok) {
			const updated: ArchiveData = await res.json();
			callback?.(updated);
		} else {
			toast.error(`Failed to save archive: ${res.statusText}`);

			const text = await res.text();
			console.error('Failed to save archive', text);
		}
	} catch (e) {
		console.error(e);

		if (e instanceof Error) {
			toast.error(`Failed to save archive: ${e.message}`);
		} else {
			toast.error(`Failed to save archive`);
		}

		throw e;
	}
};

export const scrape = async (
	ids: number[],
	site: ScrapeSite,
	callback?: (archives: ArchiveData[]) => void
) => {
	const res = await fetch(`/scrape/${site}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(ids)
	});

	if (res.ok) {
		const updated: ArchiveData[] = await res.json();
		callback?.(updated);
	} else {
		const text = await res.text();
		throw new Error(`Failed to scrape archive(s): ${text}`);
	}
};

export const reindex = async (ids: number[], callback?: (archives: ArchiveData[]) => void) => {
	const res = await fetch(`/reindex`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(ids)
	});

	if (res.ok) {
		const updated: ArchiveData[] = await res.json();
		callback?.(updated);
	} else {
		const { message } = await res.json();
		throw new Error(`Failed to reindex archive(s): ${message}`);
	}
};
