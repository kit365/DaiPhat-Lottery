import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const serverJs = path.join(standaloneDir, 'server.js');

if (!existsSync(serverJs)) {
  console.error(
    'Missing .next/standalone/server.js. Run `npm run build` first.',
  );
  process.exit(1);
}

const staticSrc = path.join(root, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
if (existsSync(staticSrc)) {
  mkdirSync(path.dirname(staticDest), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
}

const publicSrc = path.join(root, 'public');
const publicDest = path.join(standaloneDir, 'public');
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
}

const port = process.env.PORT || '5173';
const hostname = process.env.HOSTNAME || '0.0.0.0';

const child = spawn(process.execPath, [serverJs], {
  cwd: standaloneDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: hostname,
    NODE_ENV: 'production',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
