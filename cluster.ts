import cluster from 'node:cluster';
import { cpus } from 'node:os';
import serve from './build';

if (cluster.isPrimary) {
	for (let i = 0; i < cpus().length; i++) {
		cluster.fork();
	}
} else {
	serve();
}
