#!/usr/bin/env node
// Tiny static server for local development. It serves site/ with the same
// security headers Cloudflare Pages applies from site/_headers, so the browser
// behaves the same locally as it will online.
//
// Run with:  npm run dev   (then open http://localhost:5173)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'site');
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// Parse site/_headers (only the "/*" block is needed locally).
function globalHeaders() {
  const headers = {};
  let inGlobal = false;
  for (const line of fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ')) {
      inGlobal = line.trim() === '/*';
      continue;
    }
    if (inGlobal) {
      const i = line.indexOf(':');
      headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return headers;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    file = path.join(ROOT, '404.html');
    res.writeHead(404, { 'Content-Type': TYPES['.html'], ...globalHeaders() });
    fs.createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
    ...globalHeaders(),
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => console.log(`Presay running at http://localhost:${PORT}`));
