import express from 'express';
import Joi from 'joi';
import { LeetCode } from 'leetcode-query';
import GeminiService from '../services/gemini.js';

const router = express.Router();
const lc = new LeetCode();

// Validation schemas
const startProblemSchema = Joi.object({
  problemDescription: Joi.string().min(1).max(2000).required(),
  language: Joi.string().valid('javascript', 'python', 'java', 'cpp').required()
});

const analyzeStepSchema = Joi.object({
  stepId: Joi.string().required(),
  code: Joi.string().min(1).max(10000).required(),
  language: Joi.string().valid('javascript', 'python', 'java', 'cpp').required(),
  stepInstruction: Joi.string().required(),
  lineRanges: Joi.array().items(Joi.number()).optional()
});

const generateSimilarProblemSchema = Joi.object({
  problemDescription: Joi.string().min(1).max(2000).required()
});

const chatSchema = Joi.object({
  history: Joi.array().items(Joi.object({
    type: Joi.string().valid('user', 'assistant').required(),
    content: Joi.string().required(),
    timestamp: Joi.string().optional()
  })).required(),
  currentStepInstruction: Joi.string().optional(),
  currentCode: Joi.string().optional(),
  currentLanguage: Joi.string().valid('javascript', 'python', 'java', 'cpp').optional()
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

// Middleware to check if Gemini service is available
const checkGeminiService = (req, res, next) => {
  if (!req.geminiService || !req.geminiService.isInitialized) {
    return res.status(503).json({
      success: false,
      error: 'AI service is not available',
      error_code: 'SERVICE_UNAVAILABLE'
    });
  }
  next();
};

// POST /api/leetcode/startProblem - Start a new LeetCode problem
router.post('/startProblem', 
  validateRequest(startProblemSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      const result = await req.geminiService.generateLeetCodeSteps(
        req.validatedBody.problemDescription,
        req.validatedBody.language
      );
      
      const responseTime = Date.now() - startTime;
      if (result && result.problem && result.problem.description) {
        console.log('FULL PROBLEM DESCRIPTION (TERMINAL):');
        console.log(result.problem.description);
        console.log('-------------------');
      }
      console.log(`✅ LeetCode problem started in ${responseTime}ms`);

      // Format the problem before returning
      if (result && result.problem) {
        result.problem = req.geminiService.formatLeetCodeProblem(result.problem);
      }

      res.json({
        success: true,
        problem: result.problem,
        welcomeMessage: result.welcomeMessage,
        request_id: `leetcode_start_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('LeetCode start problem error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start LeetCode problem',
        error_code: 'START_PROBLEM_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/analyzeStep - Analyze user's code for current step
router.post('/analyzeStep',
  validateRequest(analyzeStepSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`�� Analyzing LeetCode step: ${req.validatedBody.stepId}`);

      const result = await req.geminiService.analyzeLeetCodeStep(
        req.validatedBody.code,
        req.validatedBody.language,
        req.validatedBody.stepInstruction,
        req.validatedBody.lineRanges || [],
        req.validatedBody.stepId
      );
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Step analysis completed in ${responseTime}ms. All correct: ${result.allCorrect}`);

      res.json({
        success: true,
        feedback: result.feedback,
        chatMessage: result.chatMessage,
        allCorrect: result.allCorrect,
        request_id: `leetcode_analyze_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('LeetCode analyze step error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze step',
        error_code: 'ANALYZE_STEP_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// --- Comment out similar problem generation route and Gemini prompt usage ---
// router.post('/generateSimilarProblem', checkGeminiService, async (req, res) => {
//   try {
//     const { problemDescription } = req.body;
//     const result = await req.geminiService.generateSimilarLeetCodeProblem(problemDescription);
//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
// ... existing code ...

// POST /api/leetcode/chat - Handle chat interactions
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
      console.log(`✅ Chat response generated in ${responseTime}ms`);

      res.json({
        success: true,
        response: result.response,
        request_id: `leetcode_chat_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('LeetCode chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process chat message',
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

// GET /api/leetcode/problem/:slug - Get full problem details
router.get('/problem/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const problem = await lc.problem(slug);
    // Format the problem for markdown rendering if possible
    if (problem && req.geminiService && typeof req.geminiService.formatLeetCodeProblem === 'function') {
      req.geminiService.formatLeetCodeProblem(problem);
    }
    res.json({ success: true, problem });
  } catch (error) {
    console.error('Error fetching LeetCode problem:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch problem' });
  }
});

// GET /api/leetcode/assigned - Get first 10 assigned LeetCode problems
router.get('/assigned', async (req, res) => {
  try {
    const leetcode = new LeetCode();
    const problemsList = await leetcode.problems({ limit: 10 });
    const assigned = problemsList.questions.map(p => ({
      title: p.title,
      titleSlug: p.titleSlug,
      difficulty: p.difficulty
    }));
    res.json({ success: true, problems: assigned });
  } catch (error) {
    console.error('Error fetching assigned LeetCode problems:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assigned problems' });
  }
});

// GET /api/leetcode/testcases - Fetch LeetCode test cases
router.get('/testcases', async (req, res) => {
  const slug = req.query.slug;
  if (!slug) return res.status(400).json({ error: 'Missing slug parameter' });
  
  // Check if this is an AI-generated problem (not a real LeetCode slug)
  if (slug === 'similar-problem' || slug.includes('similar') || slug.includes('generated')) {
    // Return empty testcases for AI-generated problems
    res.json({ testcases: '' });
    return;
  }
  
  try {
    const problem = await lc.problem(slug);
    if (!problem) {
      // If problem is null, return empty testcases
      res.json({ testcases: '' });
      return;
    }
    // Try to get the most relevant test case field
    const testcases = problem.exampleTestcases || problem.sampleTestCase || problem.sampleTestcases || '';
    res.json({ testcases });
    console.log("TESTCASES: " + testcases)
  } catch (err) {
    console.error('Error fetching testcases for slug:', slug, err);
    // Return empty testcases instead of error for better UX
    res.json({ testcases: '' });
  }
});

// GET /api/leetcode/problem/:slug/structured - Get structured problem details (examples, inputs, outputs)
router.get('/problem/:slug/structured', checkGeminiService, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Check if this is an AI-generated problem (not a real LeetCode slug)
    if (slug === 'similar-problem' || slug.includes('similar') || slug.includes('generated')) {
      // Return empty structured data for AI-generated problems
      res.json({
        success: true,
        structured: {
          instructions: '',
          examples: '',
          inputs: [],
          outputs: []
        },
        meta: {
          title: 'AI Generated Problem',
          difficulty: 'Medium',
          description: 'This is an AI-generated similar problem for practice.',
          slug: slug
        }
      });
      return;
    }
    
    // Fetch full problem details from LeetCode
    const problem = await lc.problem(slug);
    if (!problem) {
      // If problem is null, return empty structured data
      res.json({
        success: true,
        structured: {
          instructions: '',
          examples: '',
          inputs: [],
          outputs: []
        },
        meta: {
          title: 'Problem Not Found',
          difficulty: 'Unknown',
          description: 'Problem details not available.',
          slug: slug
        }
      });
      return;
    }
    
    // Extract fields directly from the problem object
    const description = problem.content || problem.description || '';
    const examples = problem.exampleTestcases || problem.sampleTestCase || problem.sampleTestcases || '';
    const inputs = problem.input || '';
    const outputs = problem.output || '';

    // Log the slug and full problem description/content to the terminal
    console.log('LEETCODE STRUCTURED PROBLEM FETCHED:');
    console.log('Slug:', slug);
    console.log('Description/Content:');
    console.log(description);
    console.log('-------------------');

    // Return the raw fields as structured data (no Gemini formatting)
    res.json({
      success: true,
      structured: {
        instructions: '', // Not available directly
        examples: examples,
        inputs: Array.isArray(inputs) ? inputs : [inputs],
        outputs: Array.isArray(outputs) ? outputs : [outputs]
      },
      meta: {
        title: problem.title,
        difficulty: problem.difficulty,
        description: description,
        slug: slug
      }
    });
  } catch (error) {
    console.error('Error fetching structured LeetCode problem:', error);
    // Return empty structured data instead of error for better UX
    res.json({
      success: true,
      structured: {
        instructions: '',
        examples: '',
        inputs: [],
        outputs: []
      },
      meta: {
        title: 'Error Loading Problem',
        difficulty: 'Unknown',
        description: 'Problem details could not be loaded.',
        slug: req.params.slug
      }
    });
  }
});

// POST /api/leetcode/similar - Generate a similar LeetCode problem using AI
router.post('/similar', checkGeminiService, async (req, res) => {
  try {
    const { slug, title, description, language } = req.body;
    // Use the most descriptive info available for the prompt
    const basePrompt = description || title || slug || 'a LeetCode problem';

    // Use Gemini to generate a similar problem (reuse your prompt logic)
    const result = await req.geminiService.generateSimilarLeetCodeProblem(basePrompt, language || 'python');

    // Fallback: If Gemini returns nothing, return a generic error
    if (!result || !result.problem) {
      return res.status(500).json({
        success: false,
        error: 'AI could not generate a similar problem',
        error_code: 'SIMILAR_PROBLEM_ERROR'
      });
    }

    // Use a fake slug to indicate this is an AI-generated problem
    const aiSlug = `similar-problem-${Date.now()}`;

    // Format the Gemini-generated problem before returning
    result.problem = req.geminiService.formatLeetCodeProblem(result.problem);

    res.json({
      success: true,
      problem: {
        ...result.problem,
        slug: aiSlug,
        exampleTestcases: result.problem.exampleTestcases || '',
        steps: result.problem.steps || [],
      },
      welcomeMessage: result.welcomeMessage || {
        type: 'assistant',
        content: 'Here is a similar problem for you to practice!',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating similar problem:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate similar problem',
      error_code: 'SIMILAR_PROBLEM_ERROR'
    });
  }
});

export default router;