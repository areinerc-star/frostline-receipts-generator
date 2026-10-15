import { Redis } from '@upstash/redis';

// Vercel injects these automatically once the Upstash storage integration
// is connected to this project — nothing to configure by hand.
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Stored as a hash (receipt no -> JSON entry) rather than a list, since
// pending invoices need to be looked up and removed by number (when marked
// paid, or deleted) rather than just appended and trimmed like the log.
const PENDING_KEY = 'frostline:pending_invoices';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = (await redis.hgetall(PENDING_KEY)) || {};
      const entries = Object.values(raw)
        .map((e) => (typeof e === 'string' ? JSON.parse(e) : e))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const entry = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      if (!entry.no) {
        return res.status(400).json({ error: 'Missing invoice number' });
      }
      await redis.hset(PENDING_KEY, { [entry.no]: JSON.stringify(entry) });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const no = (req.query && req.query.no) || null;
      if (!no) {
        return res.status(400).json({ error: 'Missing invoice number' });
      }
      await redis.hdel(PENDING_KEY, no);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('pending api error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
