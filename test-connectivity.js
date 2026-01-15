
const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 2000
};

console.log("Testing connection to 127.0.0.1:3000...");

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`PROBLEM: ${e.message}`);
});

req.on('timeout', () => {
  console.error("TIMEOUT");
  req.destroy();
});

req.end();
