// Local Supabase fixture server. Loaded by the capture harness only.
const http = require('node:http');
module.exports = function createCaptureProxy() {
  const rows = { platform_settings: { hidePropertyPrices: true }, about_page: {} };
  let failWrites = false, reads = 0, writes = 0;
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'capture@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-10-13T00:00:00Z' };
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture.invalid');
    const json = (data, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
    if (url.pathname === '/auth/v1/user' && req.method === 'GET') return json(user);
    if (url.pathname.startsWith('/rest/v1/')) {
      const table = url.pathname.split('/').pop();
      const key = url.searchParams.get('key')?.replace(/^eq\./, '');
      if (['GET', 'HEAD'].includes(req.method)) {
        reads++;
        if (table === 'site_content') return json(key && rows[key] ? [{ key, content: rows[key] }] : []);
        return json([]);
      }
      if (table !== 'site_content') return json({ message: 'Capture forbids writes to ' + table }, 403);
      writes++;
      if (failWrites) return json({ message: 'capture write rejected', code: '42501' }, 403);
      if (req.method === 'DELETE') delete rows[key];
      else if (req.method === 'POST') {
        let body = ''; for await (const chunk of req) body += chunk;
        const record = JSON.parse(body); rows[record.key] = record.content;
      } else return json({ message: 'Unexpected mutation' }, 403);
      res.statusCode = 204; return res.end();
    }
    if (url.pathname === '/' && req.method === 'POST') {
      let body = ''; for await (const chunk of req) body += chunk;
      const command = JSON.parse(body);
      if ('failWrites' in command) failWrites = command.failWrites;
      if (command.rows) Object.assign(rows, command.rows);
    } else if (url.pathname !== '/') return json({ message: 'Capture forbids this endpoint' }, 403);
    json({ reads, writes, rows, failWrites });
  });
};
