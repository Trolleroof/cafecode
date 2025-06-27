import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const startProblemSchema = Joi.object({
  problemDescription: Joi.string().min(10).max(2000).required(),
  language: Joi.string().valid('javascript', 'python', 'java', 'cpp', 'c').required()
});

const analyzeStepSchema = Joi.object({
  stepId: Joi.string().required(),
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid('javascript', 'python', 'java', 'cpp', 'c').required(),
  stepInstruction: Joi.string().required(),
  lineRanges: Joi.array().items(Joi.number().integer().min(1)).required()
});

const generateSimilarProblemSchema = Joi.object({
  problemDescription: Joi.string().min(10).max(2000).required()
});

const chatSchema = Joi.object({
  history: Joi.array().items(Joi.object({
    type: Joi.string().valid('user', 'assistant').required(),
    content: Joi.string().required(),
    timestamp: Joi.string().optional()
  })).required(),
  currentStepInstruction: Joi.string().optional(),
  currentCode: Joi.string().optional(),
  currentLanguage: Joi.string().valid('javascript', 'python', 'java', 'cpp', 'c').optional()
});

// Middleware to validate request body
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        error_code: 'VALIDATION_ERROR',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.validatedBody = value;
    next();
  };
};

// Middleware to check Gemini service availability
const checkGeminiService = (req, res, next) => {
  if (!req.geminiService) {
    return res.status(503).json({
      success: false,
      error: 'Gemini AI service is not available',
      error_code: 'SERVICE_UNAVAILABLE'
    });
  }
  next();
};

// POST /api/leetcode/startProblem - Start a new LeetCode problem session
router.post('/startProblem',
  validateRequest(startProblemSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🎯 Starting LeetCode problem: ${req.validatedBody.problemDescription.substring(0, 100)}...`);

      const result = await req.geminiService.generateLeetCodeSteps(
        req.validatedBody.problemDescription,
        req.validatedBody.language
      );

      const responseTime = Date.now() - startTime;
      console.log(`✅ LeetCode problem generated in ${responseTime}ms with ${result.problem.steps.length} steps`);

      res.json({
        ...result,
        request_id: `leetcode_start_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Start problem endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during problem generation',
        error_code: 'PROBLEM_GENERATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/analyzeStep - Analyze code for a specific LeetCode step
router.post('/analyzeStep',
  validateRequest(analyzeStepSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🔍 Analyzing LeetCode step ${req.validatedBody.stepId} for ${req.validatedBody.language}`);

      const result = await req.geminiService.analyzeLeetCodeStep(
        req.validatedBody.code,
        req.validatedBody.language,
        req.validatedBody.stepInstruction,
        req.validatedBody.lineRanges,
        req.validatedBody.stepId
      );

      const responseTime = Date.now() - startTime;
      console.log(`✅ LeetCode step analysis completed in ${responseTime}ms`);

      res.json({
        ...result,
        request_id: `leetcode_analyze_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Analyze step endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during step analysis',
        error_code: 'STEP_ANALYSIS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/generateSimilarProblem - Generate a similar LeetCode problem
router.post('/generateSimilarProblem',
  validateRequest(generateSimilarProblemSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🔄 Generating similar LeetCode problem based on: ${req.validatedBody.problemDescription.substring(0, 100)}...`);

      const result = await req.geminiService.generateSimilarLeetCodeProblem(
        req.validatedBody.problemDescription
      );

      const responseTime = Date.now() - startTime;
      console.log(`✅ Similar LeetCode problem generated in ${responseTime}ms`);

      res.json({
        ...result,
        request_id: `leetcode_similar_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Generate similar problem endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during similar problem generation',
        error_code: 'SIMILAR_PROBLEM_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/chat - Handle chat interactions in LeetCode context
router.post('/chat',
  validateRequest(chatSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`💬 Processing LeetCode chat message`);

      const result = await req.geminiService.chatLeetCode(
        req.validatedBody.history,
        req.validatedBody.currentStepInstruction,
        req.validatedBody.currentCode,
        req.validatedBody.currentLanguage
      );

      const responseTime = Date.now() - startTime;
      console.log(`✅ LeetCode chat response generated in ${responseTime}ms`);

      res.json({
        ...result,
        request_id: `leetcode_chat_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('LeetCode chat endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during chat processing',
        error_code: 'CHAT_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /api/leetcode/health - LeetCode service health check
router.get('/health', async (req, res) => {
  try {
    const geminiStatus = req.geminiService ? await req.geminiService.checkHealth() : false;
    
    res.json({
      status: geminiStatus ? 'healthy' : 'degraded',
      service: 'CodeCraft LeetCode Practice API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        gemini_ai: geminiStatus ? 'connected' : 'disconnected'
      },
      endpoints: {
        startProblem: '/api/leetcode/startProblem',
        analyzeStep: '/api/leetcode/analyzeStep',
        generateSimilarProblem: '/api/leetcode/generateSimilarProblem',
        chat: '/api/leetcode/chat',
        health: '/api/leetcode/health'
      }
    });
  } catch (error) {
    console.error('LeetCode health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;