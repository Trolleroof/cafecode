import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'Code and language are required'
      });
    }

    const geminiService = req.geminiService;

    if (!geminiService) {
      return res.status(500).json({
        success: false,
        error: 'Gemini service not available'
      });
    }

    const result = await geminiService.getHint({
      code,
      language
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      hint: result
    });

  } catch (error) {
    console.error('Hint route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 