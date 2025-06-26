import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview-0617' });
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const result = await this.model.generateContent('Respond with "OK" if you are working.');
      const response = await result.response;
      const text = response.text();
      
      if (text.includes('OK') || text.toLowerCase().includes('working') || text.length > 0) {
        this.isInitialized = true;
        console.log('✅ Gemini AI works');
        return true;
      } else {
        throw new Error('Unexpected response from Gemini AI');
      }
    } catch (error) {
      console.error('❌ Gemini AI initialization failed:', error.message);
      throw error;
    }
  }

  async checkHealth() {
    try {
      if (!this.isInitialized) {
        return false;
      }
      
      const result = await this.model.generateContent('Health check');
      const response = await result.response;
      return !!response.text();
    } catch (error) {
      console.error('Gemini health check failed:', error.message);
      return false;
    }
  }

  // Helper function to create project context from files
  createProjectContext(projectFiles) {
    if (!projectFiles || !Array.isArray(projectFiles)) {
      return '';
    }

    const formatFiles = (files, indent = 0) => {
      return files.map(file => {
        const prefix = '  '.repeat(indent);
        if (file.type === 'folder') {
          const children = file.children ? formatFiles(file.children, indent + 1) : '';
          return `${prefix}📁 ${file.name}/\n${children}`;
        } else {
          const preview = file.content ? 
            (file.content.length > 200 ? file.content.substring(0, 200) + '...' : file.content) : 
            '[empty]';
          return `${prefix}📄 ${file.name} (${file.language || 'unknown'})\n${prefix}   Content: ${preview}\n`;
        }
      }).join('');
    };

    return `\n\nProject Context - Available Files:\n${formatFiles(projectFiles)}`;
  }

  createAnalysisPrompt(code, language, errorMessage = null, context = null, projectFiles = null) {
    const projectContext = this.createProjectContext(projectFiles);
    
    return `Analyze this ${language} code and provide a comprehensive analysis.

Code:
\`\`\`${language}
${code}
\`\`\`

${errorMessage ? `Error: ${errorMessage}` : ''}
${context ? `Context: ${context}` : ''}
${projectContext}

Return JSON:
{
  "errors": [{"type": "syntax|runtime|logic|performance|style", "line_number": number, "column_number": number, "message": "description", "severity": "low|medium|high|critical", "suggestion": "fix"}],
  "warnings": [{"type": "syntax|runtime|logic|performance|style", "line_number": number, "column_number": number, "message": "description", "severity": "low|medium|high|critical", "suggestion": "improvement"}],
  "suggestions": ["improvement 1", "improvement 2"],
  "code_quality_score": number_between_0_and_100,
  "analysis_summary": "overall summary"
}

Focus on syntax errors, logic bugs, performance issues, code style, security vulnerabilities, and readability.`;
  }

  createFixPrompt(code, language, errorMessage, lineNumber = null, projectFiles = null) {
    const projectContext = this.createProjectContext(projectFiles);
    
    return `Fix this ${language} code with error: ${errorMessage}

Code:
\`\`\`${language}
${code}
\`\`\`

${lineNumber ? `Error at line: ${lineNumber}` : ''}
${projectContext}

IMPORTANT: Return JSON with TWO distinct pieces of information:
1. "fixed_code": The COMPLETE corrected file content (entire file with all fixes applied)
2. "fixes_applied": Array of granular changes, where each object contains:
   - "line_number": The line number where the change was made
   - "original_content": The original line(s) content before the fix (only the changed lines)
   - "fixed_content": The corrected line(s) content after the fix (only the changed lines)
   - "explanation": Brief explanation of what was changed

Return JSON:
{
  "fixed_code": "complete corrected code for the entire file",
  "fixes_applied": [
    {
      "line_number": number,
      "original_content": "original line content only",
      "fixed_content": "corrected line content only", 
      "explanation": "what was changed"
    }
  ],
  "explanation": "overall explanation of all fixes"
}

CRITICAL: 
- "fixed_code" should contain the ENTIRE corrected file
- "original_content" and "fixed_content" should ONLY contain the specific lines that were changed, not the entire file
- Focus on precise, granular changes for the fixes_applied array
- Preserve the original structure and logic while fixing the specific error`;
  }

  createHintPrompt(code, language, stepInstruction = null, lineRanges = null, stepId = null, projectFiles = null) {
    const projectContext = this.createProjectContext(projectFiles);
    
    const stepContext = stepInstruction && lineRanges && stepId 
      ? `Step ${stepId}: ${stepInstruction} (Lines ${lineRanges.join('-')})

Analyze if code correctly implements this step. If correct: confirm success. If incorrect: provide simple hint for this step only.`
      : 'Provide a simple, beginner-friendly hint for this code.';

    return `${stepContext}

Code:
\`\`\`${language}
${code}
\`\`\`

${projectContext}

Return JSON:
{
  "hint_text": "simple hint or confirmation",
  "line_number": number or null,
  "suggestion_type": "syntax|logic|best_practice|performance|security|readability",
  "detailed_explanation": "optional detailed explanation"
}

Use extremely simple language for complete beginners.`;
  }

  // Helper function to robustly extract JSON from Gemini responses
  extractJsonFromResponse(responseText) {
    // Try to extract JSON from markdown code blocks first
    const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    // Try to extract the first {...} or [...] block
    const curlyMatch = responseText.match(/({[\s\S]*})/);
    if (curlyMatch) {
      return curlyMatch[1].trim();
    }
    const arrayMatch = responseText.match(/(\[[\s\S]*\])/);
    if (arrayMatch) {
      return arrayMatch[1].trim();
    }
    // Fallback: return the response as-is
    return responseText.trim();
  };

  // Helper function to robustly parse JSON, with repair fallback
  robustJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      // Try to trim to last closing brace/bracket
      let lastCurly = jsonString.lastIndexOf('}');
      let lastSquare = jsonString.lastIndexOf(']');
      let last = Math.max(lastCurly, lastSquare);
      if (last !== -1) {
        try {
          return JSON.parse(jsonString.slice(0, last + 1));
        } catch (e2) {
          // fall through
        }
      }
      // If still fails, throw with more context
      console.error('Failed to parse JSON response:', e.message);
      console.error('Response text:', jsonString);
      throw new Error(`Invalid JSON response from AI: ${e.message}`);
    }
  }

  async analyzeCode(request) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = this.createAnalysisPrompt(
        request.code,
        request.language,
        request.error_message,
        request.context,
        request.projectFiles
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const analysisData = this.robustJsonParse(cleanResponse);
      const executionTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        errors: analysisData.errors || [],
        warnings: analysisData.warnings || [],
        suggestions: analysisData.suggestions || [],
        code_quality_score: analysisData.code_quality_score || 50,
        analysis_summary: analysisData.analysis_summary || 'Analysis completed',
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('Code analysis failed:', error.message);

      return {
        success: false,
        errors: [{
          type: 'runtime',
          message: `Analysis failed: ${error.message}`,
          severity: 'high',
          suggestion: 'Please check your code and try again'
        }],
        warnings: [],
        suggestions: [],
        code_quality_score: 0,
        analysis_summary: `Analysis failed due to error: ${error.message}`,
        execution_time: executionTime
      };
    }
  }

  async fixCode(request) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = this.createFixPrompt(
        request.code,
        request.language,
        request.error_message,
        request.line_number,
        request.projectFiles
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const fixData = this.robustJsonParse(cleanResponse);
      const executionTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        fixed_code: fixData.fixed_code || request.code,
        fixes_applied: fixData.fixes_applied || [],
        explanation: fixData.explanation || 'Code has been fixed',
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('Code fixing failed:', error.message);

      return {
        success: false,
        fixed_code: request.code,
        fixes_applied: [],
        explanation: `Failed to fix code: ${error.message}`,
        execution_time: executionTime
      };
    }
  }

  async translateText(text, projectFiles = null, targetLanguage = 'English') {
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const projectContext = this.createProjectContext(projectFiles);

      const prompt = `Translate this programming error message into simple English for beginners:

Error: ${text}
${projectContext}

Return JSON:
{
  "translated_text": "simple explanation without markdown",
  "error_type": "syntax|runtime|logic|type|reference|etc",
  "severity": "low|medium|high|critical",
  "suggestions": ["actionable fix 1", "actionable fix 2"],
  "common_causes": ["common reason 1", "common reason 2"]
}

Use extremely simple language for complete beginners.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const translationData = this.robustJsonParse(cleanResponse);

      return {
        success: true,
        translated_text: translationData.translated_text,
        error_type: translationData.error_type,
        severity: translationData.severity,
        suggestions: translationData.suggestions,
        common_causes: translationData.common_causes
      };

    } catch (error) {
      console.error('Translation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getHint(request) {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = this.createHintPrompt(
        request.code,
        request.language,
        request.stepInstruction,
        request.lineRanges,
        request.stepId,
        request.projectFiles
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const hintData = this.robustJsonParse(cleanResponse);
      const executionTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        hint_text: hintData.hint_text || 'No specific hint available.',
        line_number: hintData.line_number || null,
        suggestion_type: hintData.suggestion_type || 'general',
        detailed_explanation: hintData.detailed_explanation || null,
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('Hint generation failed:', error.message);

      return {
        success: false,
        hint_text: `Failed to generate hint: ${error.message}`,
        line_number: null,
        suggestion_type: 'error',
        detailed_explanation: null,
        execution_time: executionTime
      };
    }
  }

  // NEW LEETCODE METHODS

  async generateLeetCodeSolution(problemDetails) {
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      // Mock solution steps for initial implementation
      const mockSolutions = {
        'Two Sum': [
          {
            line: 1,
            instruction: 'Create a function that takes an array and target as parameters',
            code: 'function twoSum(nums, target) {',
            explanation: 'We start by defining our function with the required parameters'
          },
          {
            line: 2,
            instruction: 'Create a hash map to store numbers and their indices',
            code: '    const map = new Map();',
            explanation: 'A hash map allows us to look up values in O(1) time'
          },
          {
            line: 3,
            instruction: 'Loop through the array with index',
            code: '    for (let i = 0; i < nums.length; i++) {',
            explanation: 'We need to check each number and its position'
          },
          {
            line: 4,
            instruction: 'Calculate the complement (target - current number)',
            code: '        const complement = target - nums[i];',
            explanation: 'The complement is what we need to add to current number to get target'
          },
          {
            line: 5,
            instruction: 'Check if complement exists in our map',
            code: '        if (map.has(complement)) {',
            explanation: 'If we\'ve seen the complement before, we found our answer'
          },
          {
            line: 6,
            instruction: 'Return the indices of complement and current number',
            code: '            return [map.get(complement), i];',
            explanation: 'Return the stored index of complement and current index'
          },
          {
            line: 7,
            instruction: 'Store current number and its index in map',
            code: '        map.set(nums[i], i);',
            explanation: 'Save this number for future complement checks'
          },
          {
            line: 8,
            instruction: 'Close the loop',
            code: '    }',
            explanation: 'End of the for loop'
          },
          {
            line: 9,
            instruction: 'Close the function',
            code: '}',
            explanation: 'End of the function'
          }
        ],
        'Reverse Integer': [
          {
            line: 1,
            instruction: 'Create a function that takes an integer x',
            code: 'function reverse(x) {',
            explanation: 'Define the function to reverse an integer'
          },
          {
            line: 2,
            instruction: 'Handle the sign and get absolute value',
            code: '    const sign = x < 0 ? -1 : 1;',
            explanation: 'Store the sign separately to handle negative numbers'
          },
          {
            line: 3,
            instruction: 'Convert to string, reverse, and convert back',
            code: '    const reversed = parseInt(Math.abs(x).toString().split(\'\').reverse().join(\'\'));',
            explanation: 'Use string manipulation to reverse the digits'
          },
          {
            line: 4,
            instruction: 'Check for 32-bit integer overflow',
            code: '    if (reversed > Math.pow(2, 31) - 1) return 0;',
            explanation: 'Return 0 if the result exceeds 32-bit integer range'
          },
          {
            line: 5,
            instruction: 'Return the result with correct sign',
            code: '    return sign * reversed;',
            explanation: 'Apply the original sign to the reversed number'
          },
          {
            line: 6,
            instruction: 'Close the function',
            code: '}',
            explanation: 'End of the function'
          }
        ],
        'Palindrome Number': [
          {
            line: 1,
            instruction: 'Create a function that takes an integer x',
            code: 'function isPalindrome(x) {',
            explanation: 'Define the function to check if number is palindrome'
          },
          {
            line: 2,
            instruction: 'Handle negative numbers',
            code: '    if (x < 0) return false;',
            explanation: 'Negative numbers cannot be palindromes'
          },
          {
            line: 3,
            instruction: 'Convert number to string',
            code: '    const str = x.toString();',
            explanation: 'Convert to string to easily compare characters'
          },
          {
            line: 4,
            instruction: 'Compare string with its reverse',
            code: '    return str === str.split(\'\').reverse().join(\'\');',
            explanation: 'Check if string reads same forwards and backwards'
          },
          {
            line: 5,
            instruction: 'Close the function',
            code: '}',
            explanation: 'End of the function'
          }
        ]
      };

      const solution = mockSolutions[problemDetails.title] || [
        {
          line: 1,
          instruction: 'Start by understanding the problem requirements',
          code: '// TODO: Implement solution',
          explanation: 'Begin with a clear understanding of what needs to be solved'
        }
      ];

      return solution;

    } catch (error) {
      console.error('LeetCode solution generation failed:', error.message);
      return [
        {
          line: 1,
          instruction: 'Error generating solution. Please try again.',
          code: '// Error occurred',
          explanation: 'There was an issue generating the step-by-step solution'
        }
      ];
    }
  }

  async checkLeetCodeLine(problemDetails, userCode, aiSolution, currentStepIndex) {
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      // Mock feedback for initial implementation
      const currentStep = aiSolution[currentStepIndex];
      const userLines = userCode.split('\n');
      const expectedLine = currentStep?.code || '';

      // Simple check: see if user has written something similar to expected
      const userHasContent = userLines.some(line => line.trim().length > 0);
      const userHasFunction = userCode.includes('function') || userCode.includes('=>');
      const userHasLoop = userCode.includes('for') || userCode.includes('while');
      const userHasMap = userCode.includes('Map') || userCode.includes('{}') || userCode.includes('map');

      let feedback = {
        correct: false,
        suggestion: 'Keep working on your solution!',
        highlightLines: null
      };

      // Basic logic for different steps
      if (currentStepIndex === 0) {
        // First step - function definition
        if (userHasFunction) {
          feedback = {
            correct: true,
            suggestion: 'Great! You\'ve defined the function correctly.',
            highlightLines: [1]
          };
        } else {
          feedback = {
            correct: false,
            suggestion: 'Try defining a function with the correct parameters. Remember to use the function keyword.',
            highlightLines: null
          };
        }
      } else if (currentStepIndex === 1) {
        // Second step - usually data structure
        if (userHasMap || userCode.includes('const') || userCode.includes('let')) {
          feedback = {
            correct: true,
            suggestion: 'Excellent! You\'ve created the necessary data structure.',
            highlightLines: [2]
          };
        } else {
          feedback = {
            correct: false,
            suggestion: 'You need to create a data structure to store values. Consider using a Map or object.',
            highlightLines: null
          };
        }
      } else if (currentStepIndex === 2) {
        // Third step - usually loop
        if (userHasLoop) {
          feedback = {
            correct: true,
            suggestion: 'Perfect! You\'ve added the loop to iterate through the data.',
            highlightLines: [3]
          };
        } else {
          feedback = {
            correct: false,
            suggestion: 'You need to add a loop to iterate through the array. Try using a for loop.',
            highlightLines: null
          };
        }
      } else {
        // Later steps - more lenient
        if (userHasContent && userCode.length > currentStepIndex * 20) {
          feedback = {
            correct: true,
            suggestion: 'Good progress! Your solution is taking shape.',
            highlightLines: [currentStepIndex + 1]
          };
        } else {
          feedback = {
            correct: false,
            suggestion: 'Continue implementing the logic. Refer to the step instruction for guidance.',
            highlightLines: null
          };
        }
      }

      return feedback;

    } catch (error) {
      console.error('LeetCode line check failed:', error.message);
      return {
        correct: false,
        suggestion: 'Error checking your code. Please try again.',
        highlightLines: null
      };
    }
  }

  async generateSimilarProblems(problemDetails) {
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      // Mock similar problems for initial implementation
      const similarProblems = {
        'Two Sum': [
          {
            title: 'Three Sum',
            description: 'Given an integer array nums, return all the triplets that sum to zero.',
            difficulty: 'Medium'
          },
          {
            title: 'Two Sum II - Input Array Is Sorted',
            description: 'Given a sorted array, find two numbers that add up to a target.',
            difficulty: 'Easy'
          },
          {
            title: 'Four Sum',
            description: 'Given an array nums of n integers, return all unique quadruplets that sum to target.',
            difficulty: 'Medium'
          }
        ],
        'Reverse Integer': [
          {
            title: 'Palindrome Number',
            description: 'Given an integer x, return true if x is a palindrome integer.',
            difficulty: 'Easy'
          },
          {
            title: 'Reverse String',
            description: 'Write a function that reverses a string.',
            difficulty: 'Easy'
          },
          {
            title: 'Reverse Words in a String',
            description: 'Given an input string s, reverse the order of the words.',
            difficulty: 'Medium'
          }
        ],
        'Palindrome Number': [
          {
            title: 'Valid Palindrome',
            description: 'Given a string s, determine if it is a palindrome.',
            difficulty: 'Easy'
          },
          {
            title: 'Longest Palindromic Substring',
            description: 'Given a string s, return the longest palindromic substring in s.',
            difficulty: 'Medium'
          },
          {
            title: 'Palindrome Linked List',
            description: 'Given the head of a singly linked list, return true if it is a palindrome.',
            difficulty: 'Easy'
          }
        ]
      };

      return similarProblems[problemDetails.title] || [
        {
          title: 'Similar Problem 1',
          description: 'A related coding challenge to practice similar concepts.',
          difficulty: 'Easy'
        },
        {
          title: 'Similar Problem 2',
          description: 'Another problem that uses similar algorithmic approaches.',
          difficulty: 'Medium'
        }
      ];

    } catch (error) {
      console.error('Similar problems generation failed:', error.message);
      return [
        {
          title: 'Error',
          description: 'Could not generate similar problems. Please try again.',
          difficulty: 'Easy'
        }
      ];
    }
  }

  async leetCodeChat(requestData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const { history, currentProblem, userCode, aiSolutionSteps, currentStepIndex } = requestData;

      // Format chat history for context
      const chatHistory = history
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      // Create context about current state
      let context = 'You are a helpful coding mentor for LeetCode practice. ';
      
      if (currentProblem) {
        context += `The user is working on "${currentProblem.title}" (${currentProblem.difficulty}). `;
      }
      
      if (aiSolutionSteps && aiSolutionSteps.length > 0) {
        context += `They have a ${aiSolutionSteps.length}-step solution guide and are currently on step ${currentStepIndex + 1}. `;
      }
      
      if (userCode) {
        context += `Their current code is ${userCode.length} characters long. `;
      }

      context += 'Provide helpful, encouraging guidance focused on learning. Use simple language and be supportive.';

      // For initial implementation, provide helpful responses based on context
      const lastMessage = history[history.length - 1]?.content.toLowerCase() || '';
      
      let response = '';
      
      if (lastMessage.includes('help') || lastMessage.includes('stuck')) {
        response = 'I\'m here to help! ';
        if (currentProblem) {
          response += `For the "${currentProblem.title}" problem, try breaking it down into smaller steps. `;
          if (aiSolutionSteps && aiSolutionSteps.length > 0) {
            const currentStep = aiSolutionSteps[currentStepIndex];
            response += `Focus on: ${currentStep?.instruction || 'the current step'}`;
          }
        } else {
          response += 'Start by getting a new problem and generating the AI solution for step-by-step guidance.';
        }
      } else if (lastMessage.includes('hint')) {
        if (aiSolutionSteps && aiSolutionSteps.length > 0) {
          const currentStep = aiSolutionSteps[currentStepIndex];
          response = `💡 **Hint for Step ${currentStepIndex + 1}:** ${currentStep?.explanation || 'Think about what this step is trying to accomplish.'}`;
        } else {
          response = 'Generate an AI solution first to get step-by-step hints!';
        }
      } else if (lastMessage.includes('explain')) {
        if (currentProblem) {
          response = `Let me explain "${currentProblem.title}": This problem asks you to ${currentProblem.description.split('.')[0].toLowerCase()}. The key insight is to think about the most efficient approach.`;
        } else {
          response = 'I\'d be happy to explain! Please load a problem first, and I can break it down for you.';
        }
      } else {
        response = 'Great question! I\'m here to help you learn. Feel free to ask about the problem, algorithm approaches, or if you need hints for your current step.';
      }

      return {
        content: response
      };

    } catch (error) {
      console.error('LeetCode chat failed:', error.message);
      return {
        content: 'Sorry, I encountered an error. Please try asking your question again.'
      };
    }
  }
}

export async function initializeGemini(apiKey) {
  const service = new GeminiService(apiKey);
  await service.initialize();
  return service;
}

export default GeminiService;