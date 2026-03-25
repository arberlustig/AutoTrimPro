const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');

const root = process.cwd();
const outDir = path.join(root, 'dist-electron');
fs.mkdirSync(outDir, { recursive: true });

function build(entry, outfile, format) {
  buildSync({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: path.join(root, outfile),
    format,
    external: ['electron', 'ffmpeg-static']
  });
}

// Electron main & preload compiled to CJS so Electron can load preload easily.
// Main as ESM (so import.meta.url works), preload as CJS.
build('electron/main.ts', 'dist-electron/main.js', 'esm');
build('electron/preload.ts', 'dist-electron/preload.cjs', 'cjs');

console.log('Built Electron files to dist-electron/');

