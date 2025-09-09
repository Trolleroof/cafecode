import express from 'express';

// Uses Google Generative Language REST API directly to enable googleSearch tool
// Keeps working even if the Node SDK version lacks this feature.

const router = express.Router();

// POST /api/search/grounded
// Body: { query: string, includeProjectContext?: boolean, projectFiles?: any, model?: string }
router.post('/grounded', async (req, res) => {
  try {
    const { query, includeProjectContext = false, projectFiles = null, model = 'gemini-2.5-flash' } = req.body || {};

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    // Prefer the existing geminiService to build project context if available
    let projectContextText = '';
    try {
      if (includeProjectContext && req.geminiService && typeof req.geminiService.createProjectContext === 'function') {
        projectContextText = req.geminiService.createProjectContext(projectFiles);
      }
    } catch (_) {
      // Non-fatal if context creation fails
    }

    const prompt = `${query}${projectContextText ? `\n\nProject Context for reference (do not invent, prefer citations):${projectContextText}` : ''}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Gemini API key not configured' });
    }

    // Compose REST request with googleSearch tool enabled
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      tools: [
        {
          googleSearch: {}
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(response.status).json({ success: false, error: `Gemini API error: ${response.statusText}`, details: errText });
    }

    const data = await response.json();

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
    const groundingMetadata = candidate?.groundingMetadata || null;

    return res.json({
      success: true,
      model,
      text,
      groundingMetadata,
      raw: data
    });
  } catch (error) {
    console.error('Grounded search failed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

