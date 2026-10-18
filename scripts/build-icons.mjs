// Packs the Phosphor icon set (MIT, @phosphor-icons/core) into public/icons
// for ProtoJam's icon library - offline, loaded only when used:
//   meta.json         [{ n: name, c: categories, t: search tags }]
//   <style>.json      { name: the icon's SVG inside its 0 0 256 256 box }
// for each style: thin, light, regular, bold, fill, duotone.
//
//   node scripts/build-icons.mjs
import { icons } from '@phosphor-icons/core';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join('node_modules', '@phosphor-icons', 'core', 'assets');
const OUT = join('public', 'icons');
const STYLES = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'];
mkdirSync(OUT, { recursive: true });

const meta = icons.map(i => ({
  n: i.name,
  c: i.categories,
  t: i.tags.filter(t => !t.startsWith('*'))
}));
writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta));

for (const style of STYLES) {
  const out = {};
  for (const { name } of icons) {
    const file = join(SRC, style, style === 'regular' ? `${name}.svg` : `${name}-${style}.svg`);
    if (!existsSync(file)) continue;
    const svg = readFileSync(file, 'utf8');
    out[name] = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  }
  writeFileSync(join(OUT, `${style}.json`), JSON.stringify(out));
  console.log(style, Object.keys(out).length);
}
writeFileSync(join(OUT, 'LICENSE.txt'), readFileSync(join('node_modules', '@phosphor-icons', 'core', 'LICENSE'), 'utf8'));
console.log('meta', meta.length);
