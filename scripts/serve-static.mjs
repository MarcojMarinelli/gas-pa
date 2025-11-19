// scripts/serve-static.mjs
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, extname } from "path";

const root = process.env.STATIC_DIR || "dist";
const port = process.env.PORT || 8087;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = createServer((req, res) => {
  let file = req.url;

  // Handle root URL
  if (file === "/") {
    file = "/ui/index.html";
  }

  const target = join(root, file);

  if (existsSync(target)) {
    // Check if it's a directory
    if (statSync(target).isDirectory()) {
      const indexFile = join(target, 'index.html');
      if (existsSync(indexFile)) {
        const ext = extname(indexFile);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(readFileSync(indexFile));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    } else {
      const ext = extname(target);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(readFileSync(target));
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
  console.log(`Dashboard: http://localhost:${port}/ui/index.html`);
  console.log(`Gallery: http://localhost:${port}/gallery/index.html`);
});

