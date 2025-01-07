import { join, resolve } from 'node:path';
import { Glob } from 'bun';
import { runtimePlatformArch } from './node_modules/sharp/lib/libvips';

const runtimePlatform = runtimePlatformArch();

if (runtimePlatform.includes('win32')) {
	const sharpDir = resolve(join('node_modules', '@img', `sharp-${runtimePlatform}`, 'lib'));
	const libFiles = Array.from(new Glob('*.*').scanSync({ cwd: sharpDir, absolute: true }));

	Bun.write(
		'./compile/sharp.ts',
		libFiles
			.map((filepath) => `import '${filepath.replaceAll('\\', '\\/\\/')}' with { type: 'file' };`)
			.join('\n')
	);
} else {
	const libvipsDir = resolve(join('node_modules', '@img', `sharp-libvips-${runtimePlatform}`));
	const libvipsLib = Array.from(
		new Glob('**/libvips-cpp.*').scanSync({ cwd: libvipsDir, absolute: true })
	)[0];

	if (!libvipsLib) {
		throw new Error('Compiled libvips library not found');
	}

	const sharpDir = resolve(join('node_modules', '@img', `sharp-${runtimePlatform}`));
	const sharpLib = Array.from(
		new Glob('**/sharp-*.node').scanSync({ cwd: sharpDir, absolute: true })
	)[0];

	if (!sharpLib) {
		throw new Error('Compiled Sharp library not found');
	}

	Bun.write(
		'./compile/sharp.ts',
		`import '${sharpLib}' with { type: 'file' };\nimport '${libvipsLib}' with { type: 'file' };\n`
	);
}
