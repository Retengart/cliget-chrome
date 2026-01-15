import { cpSync, mkdirSync } from 'fs';

// Build background and popup separately (no code splitting)
async function build() {
  mkdirSync('dist', { recursive: true });

  const results = await Promise.all([
    Bun.build({
      entrypoints: ['src/background/index.ts'],
      outdir: 'dist',
      target: 'browser',
      format: 'esm',
      splitting: false,
      minify: false,
      naming: 'background.js',
    }),
    Bun.build({
      entrypoints: ['src/popup/index.ts'],
      outdir: 'dist',
      target: 'browser',
      format: 'esm',
      splitting: false,
      minify: false,
      naming: 'popup.js',
    }),
  ]);

  // Copy CSS
  cpSync('src/styles/popup.css', 'dist/popup.css');

  // Check results
  let success = true;
  for (const result of results) {
    if (!result.success) {
      success = false;
      for (const log of result.logs) {
        console.error(log.message);
      }
    }
  }

  if (success) {
    console.log('Build completed successfully');
  } else {
    process.exit(1);
  }
}

build();
