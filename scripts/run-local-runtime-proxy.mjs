import http from 'node:http';
import { once } from 'node:events';

const PORT = Number(process.env.LOCAL_RUNTIME_PROXY_PORT || 3200);
const FRONTEND_ORIGIN = process.env.LOCAL_FRONTEND_ORIGIN || 'http://127.0.0.1:5173';
const API_ORIGIN = process.env.LOCAL_API_ORIGIN || 'http://127.0.0.1:3100';

const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const hasBody = (method = 'GET') => !['GET', 'HEAD'].includes(method.toUpperCase());

const copyHeaders = (headers) => {
  const nextHeaders = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    if (hopByHopHeaders.has(key.toLowerCase())) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => nextHeaders.append(key, item));
      continue;
    }

    nextHeaders.set(key, String(value));
  }

  return nextHeaders;
};

const readRequestBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks);
};

const selectOrigin = (pathname) => (pathname.startsWith('/api/') ? API_ORIGIN : FRONTEND_ORIGIN);

const server = http.createServer(async (request, response) => {
  try {
    const pathname = request.url || '/';
    const origin = selectOrigin(pathname);
    const targetUrl = new URL(pathname, origin);
    const body = hasBody(request.method) ? await readRequestBody(request) : undefined;
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: copyHeaders(request.headers),
      body,
      redirect: 'manual',
      duplex: body ? 'half' : undefined,
    });

    response.writeHead(
      upstream.status,
      Object.fromEntries(
        Array.from(upstream.headers.entries()).filter(([key]) => !hopByHopHeaders.has(key.toLowerCase())),
      ),
    );

    if (!upstream.body) {
      response.end();
      return;
    }

    for await (const chunk of upstream.body) {
      response.write(chunk);
    }

    response.end();
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
});

server.listen(PORT, '127.0.0.1');
await once(server, 'listening');
console.log(`local runtime proxy ready on http://127.0.0.1:${PORT}`);
