import http from 'http';
import handler from './api/router';

const port = 3002;

const server = http.createServer(async (req, res) => {
  // Convert Node's IncomingMessage to something similar to VercelRequest
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const vercelReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: Object.fromEntries(new URL(req.url || '', `http://localhost:${port}`).searchParams),
        body: body ? JSON.parse(body) : {},
      } as any;

      const vercelRes = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        setHeader(name: string, value: string) {
          this.headers[name] = value;
          res.setHeader(name, value);
        },
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          res.writeHead(this.statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        },
        send(data: string) {
          res.writeHead(this.statusCode, this.headers);
          res.end(data);
        },
        redirect(code: number, url: string) {
          res.writeHead(code, { Location: url });
          res.end();
        },
        end() {
          res.end();
        }
      } as any;

      await handler(vercelReq, vercelRes);
    } catch (error: any) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(port, () => {
  console.log(`\n🚀 API Test Server running at http://localhost:${port}`);
  console.log('\nAvailable endpoints:');
  console.log('\n📊 Monime Analytics:');
  console.log('  GET  /api/monime/analytics             - Get Monime inflows/outflows');
  console.log('  GET  /api/monime/transactions          - Get raw Monime transactions');
  console.log('\n💸 Payouts:');
  console.log('  GET  /api/payouts?userId=xxx           - List user payouts');
  console.log('  GET  /api/payouts/:id                  - Get payout by ID');
  console.log('  POST /api/payouts/user/cashout         - User cashout to momo/bank');
  console.log('  POST /api/payouts/merchant/withdraw    - Merchant withdrawal');
  console.log('  GET  /api/payouts/banks                - Get available banks');
  console.log('  GET  /api/mobile-money/providers       - Get momo providers');
  console.log('\n');
});
