export const readStream = async (stream: NodeJS.ReadableStream) => {
	const chunks: Buffer[] = [];

	for await (const chunk of stream) {
		if (typeof chunk === 'string') {
			continue;
		}

		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
};
