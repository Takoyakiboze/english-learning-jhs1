// Local verification only. No rewrites: missing resources return 404, as on Pages.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const suppliedPath = process.argv[2];
if (!suppliedPath || !/^\/(?:[A-Za-z0-9._-]+)?$/.test(suppliedPath)) {
  console.error('Usage: npm run preview:pages -- /repository-name (or /)');
  process.exit(1);
}
const prefix = suppliedPath === '/' ? '' : suppliedPath;
const root = path.resolve(__dirname, '../dist-pages');
const port = Number(process.env.PORT || 8090);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (prefix && pathname === prefix) { res.writeHead(301, { Location: `${prefix}/${new URL(req.url, 'http://localhost').search}` }).end(); return; }
  if (!pathname.startsWith(`${prefix}/`)) { res.writeHead(404).end(); return; }
  const relative = pathname.slice(prefix.length + 1);
  const target = path.resolve(root, relative.endsWith('/') || !relative ? `${relative}index.html` : relative);
  if (!target.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Pages preview: http://127.0.0.1:${port}${prefix}/`));
