// Genereert dist/sitemap.xml uit alle index.html-pagina's in dist/.
// Draait als laatste stap van build.sh, zodat nieuwe tools vanzelf meekomen.
// Pagina's met <meta name="robots" content="noindex"> worden overgeslagen.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://natuurkundehub.nl';
const DIST = 'dist';

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (entry.name === 'index.html') yield p;
  }
}

const urls = [];
for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue;
  const rel = path.relative(DIST, path.dirname(file)).split(path.sep).join('/');
  urls.push(rel ? `${SITE}/${rel}/` : `${SITE}/`);
}
urls.sort();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${urls.length} pagina's`);
