import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

const deployPkg = {
  name: pkg.name,
  version: pkg.version,
  type: pkg.type,
  main: 'index.js',
  dependencies: pkg.dependencies,
};

writeFileSync(
  resolve(__dirname, '../dist/package.json'),
  JSON.stringify(deployPkg, null, 2) + '\n'
);

console.log('Wrote dist/package.json for deployment.');
