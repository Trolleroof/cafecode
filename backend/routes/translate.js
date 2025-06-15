import express from 'express';

const router = express.Router();

router.post('/translate', async (req, res) => {
  const { text, targetLanguage } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided for translation' });
  }

  if (!req.geminiService) {
    return res.status(500).json({ error: 'Gemini service not available' });
  }

  try {
    const result = await req.geminiService.translateText(text, targetLanguage);
    if (result.success) {
      res.json({ translated_text: result.translated_text });
    } else {
      res.status(500).json({ error: result.error || 'Translation failed' });
    }
  } catch (error) {
    console.error('Error in translate route:', error);
    res.status(500).json({ error: 'Internal server error during translation' });
  }
});

export default router; 