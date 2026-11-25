// Draws the share preview (site/og.png) and the app icons (site/favicon.ico,
// site/apple-touch-icon.png) with the site's own fonts and colours.
//
// Run with:  npm run images   (set CHROME_PATH if Chrome is elsewhere)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = path.join(ROOT, 'site');
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

// Reuse the stylesheet's colours and @font-face rules, with every font inlined
// so the pages below need no server.
const css = fs.readFileSync(path.join(SITE, 'assets/styles.css'), 'utf8');
const colours = css.match(/:root\s*{[^}]*}/)[0];
const fonts = (css.match(/@font-face\s*{[^}]*}/g) ?? [])
  .map((rule) =>
    rule.replace(/url\('fonts\/([^']+)'\)/, (_, file) => {
      const data = fs.readFileSync(path.join(SITE, 'assets/fonts', file)).toString('base64');
      return `url(data:font/woff2;base64,${data})`;
    }),
  )
  .join('\n');

const html = (style, body) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fonts}
${colours}
* { margin: 0; box-sizing: border-box; }
html, body { background: transparent; }
${style}
</style></head><body>${body}</body></html>`;

// The logo is site/favicon.svg: a white "p" on cobalt, underlined in red the
// way the site marks words. Every image here is drawn from that one file.
const LOGO = fs.readFileSync(path.join(SITE, 'favicon.svg'), 'utf8').trim();
const logo = (size, { square = false } = {}) => {
  const svg = square ? LOGO.replace(/rx="14"/, 'rx="0"') : LOGO;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);
};

const SHARE = html(
  `body {
    width: 1200px; height: 630px; padding: 80px 96px;
    display: flex; flex-direction: column; justify-content: space-between;
    background: var(--canvas); color: var(--ink); font-family: var(--sans);
  }
  .brand { display: flex; align-items: center; gap: 30px; }
  .name { font: 700 112px/1 var(--serif); letter-spacing: -0.01em; }
  .tagline { margin-top: 36px; font: 500 46px/1.2 var(--sans); }
  .sheet {
    padding: 34px 44px; border-radius: 18px; background: var(--paper);
    box-shadow: var(--shadow-sheet); font: 400 50px/1.4 var(--serif);
  }
  .m { background-image: linear-gradient(var(--c), var(--c)); background-repeat: no-repeat;
       background-position: 0 92%; background-size: 100% 5px; }
  .high { --c: var(--tomato); }
  .medium { --c: var(--amber); }`,
  `<div>
    <div class="brand">${logo(104)}<span class="name">Presay</span></div>
    <p class="tagline">Check your script before you say it.</p>
  </div>
  <p class="sheet">I <span class="m medium">worked</span> with <span class="m high">three</span> teams across the <span class="m high">world</span>.</p>`,
);

// iOS rounds the corners itself, so the touch icon is a full square.
const TOUCH = html('body { width: 180px; height: 180px; }', logo(180, { square: true }));
const FAVICON = html('body { width: 32px; height: 32px; }', logo(32));

// A .ico file can hold a PNG directly: a 6-byte header, one 16-byte entry, the image.
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  async function draw(markup, width, height) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(markup, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    return Buffer.from(await page.screenshot({ type: 'png', omitBackground: true }));
  }

  fs.writeFileSync(path.join(SITE, 'og.png'), await draw(SHARE, 1200, 630));
  fs.writeFileSync(path.join(SITE, 'apple-touch-icon.png'), await draw(TOUCH, 180, 180));
  fs.writeFileSync(path.join(SITE, 'favicon.ico'), icoFromPng(await draw(FAVICON, 32, 32), 32));
  console.log('site/og.png, site/apple-touch-icon.png, site/favicon.ico');
} finally {
  await browser.close();
}
