import { runtimePlatformArch } from './node_modules/sharp/lib/libvips';

const runtimePlatform = runtimePlatformArch();
const path = `./node_modules/sharp/src/build/Release/sharp-${runtimePlatform}.node`;

// eslint-disable-next-line @typescript-eslint/no-require-imports
require(path);
Bun.write('./compile/sharp.ts', `import '${path.replace('./', '../')}' with { type: 'file' }`);
