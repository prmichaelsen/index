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

async function build() {
  try {
    console.log('Building with esbuild...');
    await esbuild.build(buildOptions);
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();