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

export const leadingZeros = <T extends number | string | bigint>(
	number: T,
	count: number
): string => {
	return number.toString().padStart(count.toString().length, '0');
};
