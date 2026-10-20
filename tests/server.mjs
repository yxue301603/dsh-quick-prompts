/** Test-only host, excluded from the installable plugin package. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const fixture = await build({ entryPoints: ['tests/fixtures/host.jsx'], bundle: true, write: false, format: 'iife', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' } });
const html = await readFile('tests/fixtures/host.html');
createServer(async (req, res) => {
  if (req.url === '/host.js') { res.setHeader('content-type', 'text/javascript'); res.end(fixture.outputFiles[0].contents); }
  else if (req.url === '/client.js') { res.setHeader('content-type', 'text/javascript'); res.end(await readFile('lib/client.js')); }
  else if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); }
  else { res.setHeader('content-type', 'text/html;charset=utf-8'); res.end(html); }
}).listen(43179, '127.0.0.1');
