import { existsSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const babelrcPath = join(root, '.babelrc');
const marker = 'daiphat-auto-babel-for-blocked-swc';
const require = createRequire(import.meta.url);

const babelConfig = {
  presets: [
    [
      'next/babel',
      {
        'preset-env': {
          targets: { esmodules: true },
          bugfixes: true,
          exclude: [
            'transform-unicode-property-regex',
            'proposal-unicode-property-regex',
            'transform-unicode-regex',
          ],
        },
      },
    ],
  ],
  [marker]: true,
};

function canLoadNativeSwc() {
  if (process.platform !== 'win32') return true;
  try {
    require('@next/swc-win32-x64-msvc');
    return true;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (message.includes('Application Control') || message.includes('blocked')) {
      return false;
    }
    // Missing optional package — let Next.js handle download/fallback.
    return true;
  }
}

function isAutoManagedBabelrc() {
  if (!existsSync(babelrcPath)) return false;
  try {
    const parsed = JSON.parse(readFileSync(babelrcPath, 'utf8'));
    return parsed?.[marker] === true;
  } catch {
    return false;
  }
}

if (canLoadNativeSwc()) {
  if (isAutoManagedBabelrc()) {
    unlinkSync(babelrcPath);
    console.log('Native Next.js SWC is available — removed auto-generated .babelrc');
  }
} else {
  writeFileSync(babelrcPath, `${JSON.stringify(babelConfig, null, 2)}\n`);
  console.warn(
    'Windows Application Control blocked @next/swc-win32-x64-msvc.\n' +
      'Falling back to Babel for this build. For faster builds, turn off Smart App Control\n' +
      '(Windows Security → App & browser control), then delete .babelrc.',
  );
}
