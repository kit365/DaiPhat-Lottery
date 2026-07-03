const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/chat/conversations/management', // assuming default API path is /api/v1
  method: 'GET',
  headers: {
    // We might need authentication. Wait, maybe the API doesn't require auth for a quick local test? Or I can just fetch from the frontend dev server?
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});
req.on('error', e => console.error(e));
req.end();
