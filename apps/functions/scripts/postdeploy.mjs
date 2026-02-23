/**
 * Restores the original package.json after Firebase deploy completes.
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '../package.json');
const backupPath = resolve(__dirname, '../package.json.firebase-backup');

if (!existsSync(backupPath)) {
  console.log('No backup found — nothing to restore.');
  process.exit(0);
}

writeFileSync(pkgPath, readFileSync(backupPath));
unlinkSync(backupPath);

console.log('Restored original package.json.');
