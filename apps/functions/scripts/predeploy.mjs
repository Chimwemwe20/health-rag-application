/**
 * Strips workspace:* devDependencies from package.json before Firebase packages
 * the source directory for Cloud Build. A backup is saved so postdeploy can restore.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '../package.json');
const backupPath = resolve(__dirname, '../package.json.firebase-backup');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

// Check if there are any workspace:* entries to strip
const workspaceDeps = Object.entries(pkg.devDependencies ?? {}).filter(([, v]) =>
  v.startsWith('workspace:')
);

if (workspaceDeps.length === 0) {
  console.log('No workspace:* devDependencies found — nothing to strip.');
  process.exit(0);
}

// Back up the original
writeFileSync(backupPath, JSON.stringify(pkg, null, 2) + '\n');

// Strip workspace:* entries from devDependencies
const cleanDevDeps = Object.fromEntries(
  Object.entries(pkg.devDependencies ?? {}).filter(([, v]) => !v.startsWith('workspace:'))
);

const cleanPkg = { ...pkg, devDependencies: cleanDevDeps };
writeFileSync(pkgPath, JSON.stringify(cleanPkg, null, 2) + '\n');

console.log('Stripped workspace:* devDependencies for deployment (backup saved).');
