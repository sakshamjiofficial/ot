const net = require('net');

const server = net.createServer((socket) => {
  const client = net.createConnection({ host: '127.0.0.1', port: 9000 }, () => {
    socket.pipe(client);
    client.pipe(socket);
  });

  client.on('error', (err) => {
    console.error('Client connection error:', err.message);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error('Host socket error:', err.message);
    client.destroy();
  });
});

server.listen(9002, '0.0.0.0', () => {
  console.log('TCP Proxy Active: Port 9002 -> MinIO Port 9000');
});
