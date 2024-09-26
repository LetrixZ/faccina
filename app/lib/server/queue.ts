export class ProcessingQueue<T, R> {
	processor: (payload: T) => R;
	queue: { payload: T; resolve: (result: R) => void; reject: (err: unknown) => void }[] = [];
	processing = false;

	constructor(processor: (payload: T) => R) {
		this.processor = processor;
	}

	async processQueue() {
		if (this.processing) return;

		this.processing = true;

		while (this.queue.length > 0) {
			const item = this.queue.shift();

			if (item) {
				try {
					const result = await this.processor(item.payload);
					item.resolve(result);
				} catch (error) {
					item.reject(error);
				}
			}
		}

		this.processing = false;
	}

	enqueue(payload: T) {
		return new Promise<R>((resolve, reject) => {
			this.queue.push({ payload, resolve, reject });
			this.processQueue();
		});
	}
}
