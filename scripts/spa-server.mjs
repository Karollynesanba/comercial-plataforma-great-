import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/octet-stream',
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function sendFile(res, filePath) {
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': getContentType(filePath),
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function resolvePath(requestPath) {
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const candidate = path.join(distDir, safePath);
  if (candidate.startsWith(distDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  return path.join(distDir, 'index.html');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    const filePath = pathname === '/' ? path.join(distDir, 'index.html') : resolvePath(pathname);
    sendFile(res, filePath);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Internal server error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, host, () => {
  console.log(`SPA server running at http://${host}:${port}`);
});
