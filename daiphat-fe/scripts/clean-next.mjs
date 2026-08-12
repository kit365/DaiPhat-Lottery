import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const nextDir = resolve(process.cwd(), '.next');

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log('Removed .next cache (fixes Windows Turbopack/webpack manifest ENOENT races).');
} else {
  console.log('No .next cache to clean.');
}
