const http = require('http');
const fs   = require('fs');
const path = require('path');

const APK_PATH = path.join(__dirname, 'app-debug.apk');
const PORT     = 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/api/v1/download-apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      return res.end('APK not ready yet. Try again in a moment.');
    }
    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type':        'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="studio-debug.apk"',
      'Content-Length':      stat.size,
    });
    fs.createReadStream(APK_PATH).pipe(res);
    console.log(`[${new Date().toISOString()}] APK download served (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html><head><title>Studio APK</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h1>📱 Studio APK</h1>
        <p><a href="/api/v1/download-apk" style="font-size:1.4em;padding:14px 28px;background:#E50914;color:#fff;border-radius:8px;text-decoration:none">⬇ Download APK</a></p>
        <p style="color:#888;font-size:.85em">studio-debug.apk</p>
      </body></html>
    `);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Download: https://vigilant-garbanzo-g4v7xrrrw9w6c9x7v-${PORT}.app.github.dev/api/v1/download-apk`);
});
