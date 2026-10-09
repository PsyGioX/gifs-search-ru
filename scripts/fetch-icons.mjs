/*!
 * GIFS Поисковик — scripts/fetch-icons.mjs
 * Скачивает Bootstrap Icons (шрифт + CSS + лицензия) в vendor/bootstrap-icons/.
 * Запуск: node scripts/fetch-icons.mjs   (нужен Node.js 18+)
 *
 * Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/>
 * Licensed under the MIT License (see LICENSE)
 * https://github.com/PsyGioX/gifs-search-ru
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '1.11.3';
const CDN = `https://cdn.jsdelivr.net/npm/bootstrap-icons@${VERSION}`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'vendor', 'bootstrap-icons');

const FILES = [
  [`${CDN}/font/bootstrap-icons.min.css`, 'font/bootstrap-icons.min.css'],
  [`${CDN}/font/fonts/bootstrap-icons.woff2`, 'font/fonts/bootstrap-icons.woff2'],
  [`${CDN}/font/fonts/bootstrap-icons.woff`, 'font/fonts/bootstrap-icons.woff'],
  [`https://raw.githubusercontent.com/twbs/icons/v${VERSION}/LICENSE`, 'LICENSE']
];

for (const [url, target] of FILES) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const path = join(OUT, target);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  console.log('✔', target);
}
console.log(`\nBootstrap Icons ${VERSION} сохранены в vendor/bootstrap-icons/`);
