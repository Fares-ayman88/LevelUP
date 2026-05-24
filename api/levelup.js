import levelupHandler from './levelup/[...path].js';

export default async function handler(req, res) {
  const host = req.headers.host || 'localhost';
  const original = new URL(req.url || '/api/levelup', `https://${host}`);
  const forwardedPath = original.searchParams.get('path') || '';

  if (forwardedPath) {
    original.searchParams.delete('path');
    const qs = original.searchParams.toString();
    req.url = `/api/levelup/${forwardedPath}${qs ? `?${qs}` : ''}`;
  }

  return levelupHandler(req, res);
}
