/**
 * Simple test server to run the API router locally
 */
const http = require('http');
const url = require('url');

// We need to transpile the TypeScript router
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Transpile the router if needed
const routerPath = path.join(__dirname, 'api', 'router.ts');
const compiledPath = path.join(__dirname, 'api', 'router.js');

console.log('Compiling API router...');
try {
  execSync(`npx tsc ${routerPath} --outDir ${path.dirname(compiledPath)} --esModuleInterop --moduleResolution node --target ES2020 --module commonjs --skipLibCheck`, {
    cwd: __dirname,
    stdio: 'inherit'
  });
} catch (e) {
  console.log('TypeScript compilation had warnings, continuing...');
}

// Import the compiled router
let handler;
try {
  handler = require('./api/router').default;
} catch (e) {
  console.error('Failed to load router:', e.message);
  process.exit(1);
}

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);

  // Create mock Vercel request/response objects
  const vercelReq = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: parsedUrl.query,
    body: null
  };

  // Read body for POST/PUT requests
  if (req.method === 'POST' || req.method === 'PUT') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const bodyStr = Buffer.concat(chunks).toString();
    try {
      vercelReq.body = JSON.parse(bodyStr);
    } catch {
      vercelReq.body = bodyStr;
    }
  }

  // Mock Vercel response
  const headers = {};
  const vercelRes = {
    statusCode: 200,
    setHeader: (name, value) => {
      headers[name] = value;
      res.setHeader(name, value);
    },
    status: (code) => {
      vercelRes.statusCode = code;
      return vercelRes;
    },
    json: (data) => {
      res.writeHead(vercelRes.statusCode, { 'Content-Type': 'application/json', ...headers });
      res.end(JSON.stringify(data));
      return vercelRes;
    },
    send: (data) => {
      res.writeHead(vercelRes.statusCode, headers);
      res.end(data);
      return vercelRes;
    },
    end: (data) => {
      res.writeHead(vercelRes.statusCode, headers);
      res.end(data);
      return vercelRes;
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

server.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log(`Test: curl http://localhost:${PORT}/api/router`);
  console.log(`Lookup: curl "http://localhost:${PORT}/api/router/mobile-money/lookup?phoneNumber=077601707&providerId=m17"`);
});
