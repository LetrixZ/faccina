import { spawn } from 'bun';

const cpus = navigator.hardwareConcurrency; // Number of CPU cores
const buns = new Array(cpus);

for (let i = 0; i < cpus; i++) {
	buns[i] = spawn({
		cmd: ['bun', './build'],
		stdout: 'inherit',
		stderr: 'inherit',
		stdin: 'inherit',
	});
}

function kill() {
	for (const bun of buns) {
		bun.kill();
	}
}

process.on('SIGINT', kill);
process.on('exit', kill);
