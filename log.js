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

    if (req.method === 'PUT') {
      // Used for a manual correction to an already-logged receipt (e.g. the
      // total was fixed after generation). The log is stored as a plain
      // Redis list (newest-first), which has no indexed update by value, so
      // we read it out, patch the matching entry in place, and rewrite the
      // whole list in one pipelined LPUSH — fine at this log's scale.
      const no = (req.query && req.query.no) || null;
      if (!no) {
        return res.status(400).json({ error: 'Missing receipt number' });
      }
      const patch = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const raw = await redis.lrange(LOG_KEY, 0, -1);
      const entries = raw.map((e) => (typeof e === 'string' ? JSON.parse(e) : e));
      const idx = entries.findIndex((e) => e.no === no);
      if (idx === -1) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      entries[idx] = { ...entries[idx], ...patch };
      await redis.del(LOG_KEY);
      if (entries.length) {
        // Reverse so that, after this single multi-value LPUSH, entries[0]
        // (newest) lands back at the head and order is preserved.
        await redis.lpush(LOG_KEY, ...entries.slice().reverse().map((e) => JSON.stringify(e)));
      }
      return res.status(200).json({ ok: true, entry: entries[idx] });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('log api error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
