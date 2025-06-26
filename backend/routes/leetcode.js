import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const generateSolutionSchema = Joi.object({
  problem: Joi.object().required()
});

const checkCodeLineSchema = Joi.object({
  problem: Joi.object().required(),
  userCode: Joi.string().required(),
  aiSolution: Joi.array().required(),
  currentStep: Joi.number().required()
});

const generateSimilarSchema = Joi.object({
  problem: Joi.object().required()
});

const chatSchema = Joi.object({
  history: Joi.array().required(),
  currentProblem: Joi.object().optional(),
  userCode: Joi.string().optional(),
  aiSolutionSteps: Joi.array().optional(),
  currentStepIndex: Joi.number().optional()
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

// GET /api/leetcode/problem - Fetch a random coding problem
router.get('/problem', async (req, res) => {
  try {
    console.log('🎯 Fetching new LeetCode problem');

    // Mock problems for initial implementation
    const mockProblems = [
      {
        id: '1',
        title: 'Two Sum',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
        difficulty: 'Easy',
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          },
          {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]'
          }
        ],
        constraints: [
          '2 <= nums.length <= 10^4',
          '-10^9 <= nums[i] <= 10^9',
          '-10^9 <= target <= 10^9',
          'Only one valid answer exists.'
        ]
      },
      {
        id: '2',
        title: 'Reverse Integer',
        description: 'Given a signed 32-bit integer `x`, return `x` with its digits reversed. If reversing `x` causes the value to go outside the signed 32-bit integer range `[-2^31, 2^31 - 1]`, then return `0`.\n\nAssume the environment does not allow you to store 64-bit integers (signed or unsigned).',
        difficulty: 'Medium',
        examples: [
          {
            input: 'x = 123',
            output: '321'
          },
          {
            input: 'x = -123',
            output: '-321'
          },
          {
            input: 'x = 120',
            output: '21'
          }
        ],
        constraints: [
          '-2^31 <= x <= 2^31 - 1'
        ]
      },
      {
        id: '3',
        title: 'Palindrome Number',
        description: 'Given an integer `x`, return `true` if `x` is palindrome integer.\n\nAn integer is a palindrome when it reads the same backward as forward.\n\nFor example, `121` is a palindrome while `123` is not.',
        difficulty: 'Easy',
        examples: [
          {
            input: 'x = 121',
            output: 'true'
          },
          {
            input: 'x = -121',
            output: 'false',
            explanation: 'From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.'
          },
          {
            input: 'x = 10',
            output: 'false',
            explanation: 'Reads 01 from right to left. Therefore it is not a palindrome.'
          }
        ],
        constraints: [
          '-2^31 <= x <= 2^31 - 1'
        ]
      }
    ];

    // Select a random problem
    const randomProblem = mockProblems[Math.floor(Math.random() * mockProblems.length)];

    console.log(`✅ Selected problem: ${randomProblem.title} (${randomProblem.difficulty})`);

    res.json({
      success: true,
      problem: randomProblem,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Problem fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching problem',
      error_code: 'PROBLEM_FETCH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/leetcode/generate-solution - Generate AI solution steps
router.post('/generate-solution',
  validateRequest(generateSolutionSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🧠 Generating solution for: ${req.validatedBody.problem.title}`);

      const result = await req.geminiService.generateLeetCodeSolution(req.validatedBody.problem);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Solution generated in ${responseTime}ms with ${result.length} steps`);

      res.json({
        success: true,
        solution: result,
        request_id: `solution_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Solution generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during solution generation',
        error_code: 'SOLUTION_GENERATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/check-code-line - Check user's code against AI solution
router.post('/check-code-line',
  validateRequest(checkCodeLineSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🔍 Checking code line for step ${req.validatedBody.currentStep + 1}`);

      const result = await req.geminiService.checkLeetCodeLine(
        req.validatedBody.problem,
        req.validatedBody.userCode,
        req.validatedBody.aiSolution,
        req.validatedBody.currentStep
      );
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Code check completed in ${responseTime}ms - ${result.correct ? 'Correct' : 'Needs improvement'}`);

      res.json({
        success: true,
        feedback: result,
        request_id: `check_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Code check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during code checking',
        error_code: 'CODE_CHECK_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/generate-similar - Generate similar problems
router.post('/generate-similar',
  validateRequest(generateSimilarSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log(`🎯 Generating similar problems for: ${req.validatedBody.problem.title}`);

      const result = await req.geminiService.generateSimilarProblems(req.validatedBody.problem);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Generated ${result.length} similar problems in ${responseTime}ms`);

      res.json({
        success: true,
        similarProblems: result,
        request_id: `similar_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Similar problems generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during similar problems generation',
        error_code: 'SIMILAR_PROBLEMS_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/leetcode/chat - LeetCode-specific chat
router.post('/chat',
  validateRequest(chatSchema),
  checkGeminiService,
  async (req, res) => {
    try {
      const startTime = Date.now();
      console.log('💬 Processing LeetCode chat message');

      const result = await req.geminiService.leetCodeChat(req.validatedBody);
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ Chat response generated in ${responseTime}ms`);

      res.json({
        success: true,
        response: {
          type: 'assistant',
          content: result.content,
          timestamp: new Date().toISOString()
        },
        request_id: `chat_${Date.now()}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('LeetCode chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during chat processing',
        error_code: 'LEETCODE_CHAT_ERROR',
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
        problem: '/api/leetcode/problem',
        generateSolution: '/api/leetcode/generate-solution',
        checkCodeLine: '/api/leetcode/check-code-line',
        generateSimilar: '/api/leetcode/generate-similar',
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