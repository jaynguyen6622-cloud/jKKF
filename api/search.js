export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const { song } = req.body;
  if (!song || typeof song !== 'string' || song.trim().length === 0) {
    return res.status(400).json({ error: 'Missing song name' });
  }

  const prompt = `Search karaoke versions and chord/tab sheets for the song: "${song.trim()}"

Search across:
- Karaoke sites and YouTube for keys (nhaccuatui, nhac.vn, karaoke sites)
- Chord and tab sites for lead sheets: hopamviet.vn, hopamchuan.com, ultimate-guitar.com, cifraclub.com, tabs.ultimate-guitar.com

Find:
1. The original key and most common male/female karaoke keys
2. A direct URL to a chord chart or lead sheet for the male key (prefer hopamviet or hopamchuan for Vietnamese songs, ultimate-guitar for English)
3. A direct URL to a chord chart or lead sheet for the female key

Reply with ONLY this exact format, no extra text:
SONG: [full song name and artist]
ORIGINAL: [key e.g. D Minor]
MALE: [most common male karaoke key]
FEMALE: [most common female karaoke key]
YOUTUBE: [official YouTube URL or NONE]
MALE_TAB: [direct URL to chord/tab sheet in male key or NONE]
FEMALE_TAB: [direct URL to chord/tab sheet in female key or NONE]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    const get = (key) => {
      const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
      return match ? match[1].trim() : null;
    };

    const result = {
      song:      get('SONG'),
      original:  get('ORIGINAL'),
      male:      get('MALE'),
      female:    get('FEMALE'),
      youtube:   get('YOUTUBE'),
      male_tab:  get('MALE_TAB'),
      female_tab: get('FEMALE_TAB'),
    };

    if (!result.original || !result.male || !result.female) {
      return res.status(422).json({ error: 'Could not find key information for this song. Try adding the artist name.' });
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
