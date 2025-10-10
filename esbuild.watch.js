import * as esbuild from 'esbuild';

const buildOptions = {
  entryPoints: ['src/server.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
  external: [
    '@modelcontextprotocol/sdk',
    'weaviate-client',
    'dotenv'
  ],
  logLevel: 'info',
  minify: false,
  keepNames: true
};

async function watch() {
  try {
    console.log('Starting esbuild watch mode...');
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('Watching for changes...');
  } catch (error) {
    console.error('Watch mode failed:', error);
    process.exit(1);
  }
}

watch();