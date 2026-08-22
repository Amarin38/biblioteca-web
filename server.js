import http from 'node:http';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-type': 'text/plain; charset=utf-8' })
    return res.end('El servidor está funcionando');
  }

  if (req.method === 'POST' && req.url === '/archivo') {
    let bytesTotales = 0;

    req.on('data', (chunk) => {
      bytesTotales += chunk.length;
    });

    req.on('end', () => {
      res.writeHead(200, { 'Content-type': 'text/plain; charset=utf-8' })
      res.end(`Bytes recibidos: ${bytesTotales}`);
    });

    return
  }

  res.writeHead(404, { 'Content-type': 'text/plain; charset=utf-8' });
  res.end('Ese endpoint no existe.');
});

server.listen(3000);
