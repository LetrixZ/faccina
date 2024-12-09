import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';
import polka from 'polka';
import { handler } from './build/handler.js';

const numCPUs = availableParallelism();

if (cluster.isPrimary) {
	console.log(`Primary ${process.pid} is running`);

	// Fork workers.
	for (let i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', (worker) => {
		console.log(`worker ${worker.process.pid} died`);
	});
} else {
	polka()
		.use(handler)
		.listen(3000, () => {
			console.log(`> Running on localhost:3000`);
		});

	console.log(`Worker ${process.pid} started`);
}
