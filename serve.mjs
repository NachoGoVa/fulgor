// Servidor estático mínimo para jugar en local: `npm run dev`.
// Hace falta http:// (no file://) porque el juego usa módulos ES.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = import.meta.dirname;
const PORT = process.env.PORT || 5180;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // normalize + prefijo obligatorio: sin esto, `../` se sale de la carpeta.
  const file = join(ROOT, normalize(path === '/' ? '/index.html' : path));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Prohibido'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}).listen(PORT, () => console.log(`FULGOR en http://localhost:${PORT}`));
