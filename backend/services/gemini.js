import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    // Updated to use the correct model name for the current API version
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Test the connection with a simple prompt
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

  createAnalysisPrompt(code, language, errorMessage = null, context = null) {
    return `
You are an expert code analyzer. Analyze the following ${language} code and provide a comprehensive analysis.

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

${errorMessage ? `Error message: ${errorMessage}` : ''}
${context ? `Context: ${context}` : ''}

Please provide your analysis in the following JSON format:
{
  "errors": [
    {
      "type": "syntax|runtime|logic|performance|style",
      "line_number": number or null,
      "column_number": number or null,
      "message": "detailed error description",
      "severity": "low|medium|high|critical",
      "suggestion": "how to fix this error"
    }
  ],
  "warnings": [
    {
      "type": "syntax|runtime|logic|performance|style",
      "line_number": number or null,
      "column_number": number or null,
      "message": "detailed warning description",
      "severity": "low|medium|high|critical",
      "suggestion": "how to improve this"
    }
  ],
  "suggestions": [
    "general improvement suggestion 1",
    "general improvement suggestion 2"
  ],
  "code_quality_score": number_between_0_and_100,
  "analysis_summary": "overall summary of the code quality and issues found"
}

Focus on:
1. Syntax errors and typos
2. Logic errors and potential bugs
3. Performance issues
4. Code style and best practices
5. Security vulnerabilities
6. Readability improvements

Be specific about line numbers when possible and provide actionable suggestions.
`;
  }

  createFixPrompt(code, language, errorMessage, lineNumber = null) {
    return `
You are an expert code fixer. Fix the following ${language} code that has an error.

Code with error:
\`\`\`${language}
${code}
\`\`\`

Error message: ${errorMessage}
${lineNumber ? `Error occurs at line: ${lineNumber}` : ''}

Please provide your fix in the following JSON format:
{
  "fixed_code": "complete corrected code",
  "fixes_applied": [
    {
      "line_number": number,
      "original_code": "original line of code",
      "fixed_code": "corrected line of code",
      "explanation": "explanation of what was changed and why"
    }
  ],
  "explanation": "overall explanation of the fixes applied",
  "confidence_score": number_between_0_and_100
}

Requirements:
1. Fix the specific error mentioned
2. Preserve the original code structure and logic as much as possible
3. Only make necessary changes to fix the error
4. Provide clear explanations for each change
5. Ensure the fixed code follows best practices
6. Maintain proper formatting and indentation
`;
  }

  createHintPrompt(code, language, stepInstruction = null, lineRanges = null, stepId = null) {
    const stepContext = stepInstruction && lineRanges && stepId 
      ? `Your goal is to help a beginner programmer complete a specific step in a guided project.

Current Step Information:
- Step ${stepId}: ${stepInstruction}
- Target Line Range: ${lineRanges.join('-')}

Hinting Logic:
1. Analyze the user's code against the Current Step Information.
2. If the code correctly implements the step's instructions, your hint should be a confirmation message, like "Looks like you've got it! Your variables are declared correctly. You can click 'Check Step' to verify and move on."
3. If the code is incorrect or incomplete for the current step, provide a small, actionable hint to guide the user toward the correct solution for THIS STEP ONLY.
4. DO NOT give hints about future steps (like getting user input) or general best practices that are not relevant to the current instruction. Your entire focus is on the current step.`
      : 'You are an expert programming assistant. Provide a general, helpful hint for the following code.';

    return `
${stepContext}

Code:
\`\`\`${language}
${code}
\`\`\`

Please provide your hint in the following JSON format:
{
  "hint_text": "A concise and helpful hint, suitable for a beginner. ${stepInstruction ? 'Your hint should be a confirmation if the code is correct, or a small tip if it is incorrect.' : ''}",
  "line_number": number or null, // The specific line number the hint refers to (null if general)
  "suggestion_type": "syntax|logic|best_practice|performance|security|readability",
  "detailed_explanation": "An optional detailed explanation if the hint needs more context."
}

Requirements for hints:
- Keep the hint concise and actionable in simple terms.
- Avoid directly giving the solution.
- Focus ONLY on the current step if one is provided.
`;
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
        request.context
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
        request.line_number
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
        confidence_score: fixData.confidence_score || 80,
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
        confidence_score: 0,
        execution_time: executionTime
      };
    }
  }

  async translateText(text, targetLanguage = 'English') {
    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = `
You are an expert programming assistant. Your task is to translate programming error messages into plain, easy-to-understand English for beginners, and provide actionable suggestions for fixing them. Ensure the output is directly usable and well-structured, without any markdown formatting that might interfere with client-side rendering (e.g., no bolding with **).

Error message:
${text}

Please provide your response in the following JSON format:
{
  "translated_text": "A clear, concise, and easy-to-understand explanation of the error message, suitable for a beginner. Avoid markdown bolding.",
  "error_type": "syntax|runtime|logic|type|reference|etc",
  "severity": "low|medium|high|critical",
  "suggestions": [
    "Specific, actionable suggestion 1 to fix the error.",
    "Specific, actionable suggestion 2 to fix the error."
  ],
  "common_causes": [
    "Common reason 1 why this error occurs.",
    "Common reason 2 why this error occurs."
  ]
}

Requirements:
1.  Explain the error in simple, non-technical terms, focusing on clarity.
2.  Identify the type and severity of the error.
3.  Provide specific, actionable suggestions for fixing the error.
4.  List common causes of this type of error to aid understanding.
5.  Keep the explanation concise but informative.
6.  Focus on helping beginners understand and fix the error efficiently.
7.  Crucially, ensure the \`translated_text\` field contains plain text without any markdown characters (like \`**\` for bolding), as the frontend will handle formatting.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const translationData = this.robustJsonParse(cleanResponse);
      const executionTime = (Date.now() - startTime) / 1000;

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
        request.stepId
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
}

export async function initializeGemini(apiKey) {
  const service = new GeminiService(apiKey);
  await service.initialize();
  return service;
}

export default GeminiService;