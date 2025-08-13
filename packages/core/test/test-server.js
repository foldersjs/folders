import http from 'http';
import { HandshakeService } from '../src/handshake.js';

const handshakeService = new HandshakeService();
let server;

function start(port = 8090) {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      const endpoint = req.url.slice(1);
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', () => {
        const handshake = Buffer.concat(body);
        const result = handshakeService.node(endpoint, handshake);
        if (result) {
          res.writeHead(200);
          res.end('OK');
        } else {
          res.writeHead(400);
          res.end('Bad Request');
        }
      });
    });

    server.listen(port, () => {
      console.log(`Test server listening on port ${port}`);
      resolve();
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Test server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export { start, stop };
