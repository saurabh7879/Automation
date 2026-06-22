module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, apiKey } = req.body;

  if (!prompt || !apiKey) {
    return res.status(400).json({ error: 'Missing prompt or API key' });
  }

  try {
    const response = await fetch('https://api.euron.one/api/v1/euri/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for job applicants.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1400,
        temperature: 0.72,
      }),
    });

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      let errorData = {};
      try { errorData = JSON.parse(rawBody); } catch (e) {}
      console.error('Euron API error', response.status, rawBody);
      return res.status(response.status).json({
        error: errorData?.error?.message || errorData?.message || `API error ${response.status}: ${rawBody.slice(0, 200)}`,
      });
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'Invalid API response format' });
    }

    return res.status(200).json({
      content: data.choices[0].message.content.trim(),
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
};
