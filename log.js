import { Redis } from '@upstash/redis';

// Vercel injects these automatically once the Upstash storage integration
// is connected to this project — nothing to configure by hand.
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const LOG_KEY = 'frostline:receipt_log';
const MAX_ENTRIES = 2000; // safety cap so the list can't grow unbounded

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // lpush (below) puts newest entries at the head, so this range is
      // already newest-first.
      const raw = await redis.lrange(LOG_KEY, 0, -1);
      const entries = raw.map((e) => (typeof e === 'string' ? JSON.parse(e) : e));
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const entry = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      if (!entry.no) {
        return res.status(400).json({ error: 'Missing receipt number' });
      }
      await redis.lpush(LOG_KEY, JSON.stringify(entry));
      await redis.ltrim(LOG_KEY, 0, MAX_ENTRIES - 1);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('log api error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
