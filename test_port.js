const http = require('http');

const req = http.get('http://localhost:3000', (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', () => {});
  res.on('end', () => console.log('DONE'));
});

req.on('error', (e) => console.log('ERROR:', e.message));
