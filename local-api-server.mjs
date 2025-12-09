/**
 * Local API server for development
 * Runs the Vercel serverless functions locally
 */
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamically import the router
const routerModule = await import('./api/router.ts');
const handler = routerModule.default;

const server = http.createServer(async (req, res) => {
  // Parse URL and body
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Read body for POST requests
  let body = '';
  if (req.method === 'POST' || req.method === 'PUT') {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => resolve(data));
    });
  }

  // Create Vercel-like request object
  const vercelReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: Object.fromEntries(url.searchParams),
    body: body ? JSON.parse(body) : undefined,
  };

  // Create Vercel-like response object
  const vercelRes = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.setHeader('Content-Type', 'application/json');
      res.writeHead(this.statusCode, this.headers);
      res.end(JSON.stringify(data));
    },
    send(data) {
      res.writeHead(this.statusCode, this.headers);
      res.end(data);
    },
    redirect(code, url) {
      res.writeHead(code, { Location: url });
      res.end();
    },
    end() {
      res.writeHead(this.statusCode, this.headers);
      res.end();
    }
  };

  try {
    await handler(vercelReq, vercelRes);
  } catch (error) {
    console.error('Handler error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Local API server running on http://localhost:${PORT}`);
});
