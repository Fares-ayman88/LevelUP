import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
process.chdir(projectRoot);

loadEnv(path.join(__dirname, '.env'));

const { default: levelupHandler } = await import('../../api/levelup/[...path].js');

const host = process.env.LEVELUP_NODE_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.LEVELUP_NODE_PORT || '8080', 10);

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function createVercelLikeResponse(res) {
  let statusCode = 200;
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      const body = JSON.stringify(data);
      res.statusCode = statusCode;
      if (!res.hasHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.end(body);
    },
    send(data) {
      const body = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      res.statusCode = statusCode;
      res.setHeader('Content-Length', body.length);
      res.end(body);
    },
  };
}

const server = http.createServer(async (req, res) => {
  try {
    req.body = await readBody(req);
    await levelupHandler(req, createVercelLikeResponse(res));
  } catch (error) {
    const body = JSON.stringify({ error: error.message || 'Internal server error.' });
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.end(body);
  }
});

server.listen(port, host, () => {
  console.log(`LevelUp Node API running on http://${host}:${port}`);
  console.log('Using the same handler as Vercel: api/levelup/[...path].js');
});
