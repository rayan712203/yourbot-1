// ═══════════════════════════════════════════════════════
//  Local dev server — mimics Vercel's routing locally
//  Run: node dev.js   →   http://localhost:3000
// ═══════════════════════════════════════════════════════

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT       = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

// Load serverless functions from /api
function loadHandler(name) {
  const filePath = path.join(__dirname, 'api', name + '.js');
  if (!fs.existsSync(filePath)) return null;
  // Clear require cache so changes are picked up
  delete require.cache[require.resolve(filePath)];
  return require(filePath);
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,stripe-signature'
    });
    return res.end();
  }

  // ── API routes → serverless function handlers ──
  if (pathname.startsWith('/api/')) {
    const fnName = pathname.replace('/api/', '').replace(/\/$/, '');
    const handler = loadHandler(fnName);

    if (!handler || typeof handler !== 'function') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'API route not found: ' + fnName }));
    }

    // Build a Vercel-like req/res
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body = await readBody(req);
    }

    // Patch res for Vercel-style: res.status(200).json({})
    res.status = (code) => { res.statusCode = code; return res; };
    const origJson = res.json;
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data));
    };

    try {
      await handler(req, res);
    } catch (err) {
      console.error('API error:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
    return;
  }

  // ── Static files ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Forbidden' }));
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, d2) => {
        if (e2) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Not found' }));
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║  YOURBOT — Local Dev Server                         ║
  ║  Running → http://localhost:${PORT}                    ║
  ║                                                      ║
  ║  Static files: /public                               ║
  ║  API functions: /api/*                               ║
  ║                                                      ║
  ║  For Vercel deployment: vercel deploy                 ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
