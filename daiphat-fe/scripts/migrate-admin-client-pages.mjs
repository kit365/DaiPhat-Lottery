import fs from 'fs';
import path from 'path';

const globRoot = 'src/app/admin';

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === 'ClientPage.tsx') files.push(p);
  }
  return files;
}

let changed = 0;

for (const file of walk(globRoot)) {
  let src = fs.readFileSync(file, 'utf8');
  const m = src.match(
    /loader:\s*\(\)\s*=>\s*import\('([^']+)'\),\s*\n\s*exportName:\s*'([^']+)'/,
  );
  if (!m) continue;
  const [, importPath, exportName] = m;
  if (src.includes('component:')) continue;

  const importLine = `import { ${exportName} } from '${importPath}';\n`;
  if (!src.includes(importLine.trim())) {
    src = src.replace(/^"use client";\n\n/, `"use client";\n\n${importLine}\n`);
  }

  src = src.replace(
    /loader:\s*\(\)\s*=>\s*import\('[^']+'\),\s*\n\s*exportName:\s*'[^']+',/,
    `component: ${exportName},`,
  );

  fs.writeFileSync(file, src);
  changed++;
}

console.log(`Migrated ${changed} ClientPage files`);
