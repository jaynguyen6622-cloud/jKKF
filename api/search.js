// Simple in-memory rate limiter
// Vercel serverless functions can spin up multiple instances, so this is
// per-instance — good enough to prevent casual abuse without a database.
const rateLimitMap = new Map();
const WINDOW_MS    = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 5;          // max 5 searches per IP per minute

function isRateLimited(ip) {
  const now     = Date.now();
  const entry   = rateLimitMap.get(ip) || { count: 0, start: now };

  // Reset window if expired
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  // Clean up old entries every ~100 requests to prevent memory leak
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap) {
      if (now - val.start > WINDOW_MS) rateLimitMap.delete(key);
    }
  }

  return entry.count > MAX_REQUESTS;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || req.headers['x-real-ip']
          || req.socket?.remoteAddress
          || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Too many searches. Please wait a minute and try again.'
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const { song } = req.body;
  if (!song || typeof song !== 'string' || song.trim().length === 0) {
    return res.status(400).json({ error: 'Missing song name' });
  }

  // Sanitize input - max 200 chars to prevent prompt injection
  const safeSong = song.trim().slice(0, 200);

  const prompt = `Find karaoke keys and chords for: "${safeSong}"
Reply ONLY in this exact format, no extra text:
SONG: [name - artist]
ORIGINAL: [key]
MALE: [key]
FEMALE: [key]
YOUTUBE: [url or NONE]
MALE_TAB: [chord sheet url or NONE]
FEMALE_TAB: [chord sheet url or NONE]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const text  = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    const get = (key) => {
      const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
      return match ? match[1].trim() : null;
    };

    const result = {
      song:       get('SONG'),
      original:   get('ORIGINAL'),
      male:       get('MALE'),
      female:     get('FEMALE'),
      youtube:    get('YOUTUBE'),
      male_tab:   get('MALE_TAB'),
      female_tab: get('FEMALE_TAB'),
    };

    if (!result.original || !result.male || !result.female) {
      return res.status(422).json({
        error: 'Could not find key information for this song. Try adding the artist name.'
      });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
