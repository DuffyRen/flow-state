'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.E2E_PORT || 4173);
const ROOT = path.resolve(__dirname, '../..');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png'
};

const server = http.createServer((req, res) => {
    const urlPath = (req.url || '/').split('?')[0];
    const rel = urlPath === '/' ? '/code_artifact.html' : urlPath;
    const filePath = path.normalize(path.join(ROOT, rel));

    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, '127.0.0.1');
