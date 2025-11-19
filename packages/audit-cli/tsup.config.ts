import { defineConfig } from 'tsup';
import nodePreset from '@kb-labs/devkit/tsup/node.js';

export default defineConfig({
  ...nodePreset,
  entry: [
    'src/index.ts',
    'src/manifest.v2.ts',
    'src/setup/handler.ts',
    'src/cli/commands/*.ts',
    'src/rest/handlers/*.ts'
  ],
  tsconfig: "tsconfig.build.json", // Use build-specific tsconfig without paths
  dts: {
    resolve: true,
    skipLibCheck: true
  },
  clean: true
});


