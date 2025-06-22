import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text, projectFiles } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Access the geminiService instance from the request object
    const geminiService = req.geminiService;

    if (!geminiService) {
      return res.status(500).json({
        success: false,
        error: 'Gemini service not available'
      });
    }

    const result = await geminiService.translateText(text, projectFiles);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      translation: {
        text: result.translated_text,
        error_type: result.error_type,
        severity: result.severity,
        suggestions: result.suggestions,
        common_causes: result.common_causes
      }
    });

  } catch (error) {
    console.error('Translation route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;