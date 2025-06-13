import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Test the connection with a simple prompt
      const result = await this.model.generateContent('Hello, respond with "OK" if you are working.');
      const response = await result.response;
      const text = response.text();
      
      if (text.includes('OK')) {
        this.isInitialized = true;
        console.log('✅ Gemini AI connection verified');
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

  parseJsonResponse(responseText) {
    try {
      // Try to extract JSON from markdown code blocks
      let jsonText = responseText;
      
      if (responseText.includes('```json')) {
        const start = responseText.indexOf('```json') + 7;
        const end = responseText.indexOf('```', start);
        jsonText = responseText.substring(start, end).trim();
      } else if (responseText.includes('```')) {
        const start = responseText.indexOf('```') + 3;
        const end = responseText.indexOf('```', start);
        jsonText = responseText.substring(start, end).trim();
      }
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse JSON response:', error.message);
      console.error('Response text:', responseText);
      throw new Error(`Invalid JSON response from AI: ${error.message}`);
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
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini AI');
      }

      const analysisData = this.parseJsonResponse(text);
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
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini AI');
      }

      const fixData = this.parseJsonResponse(text);
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
}

export async function initializeGemini(apiKey) {
  const service = new GeminiService(apiKey);
  await service.initialize();
  return service;
}

export default GeminiService;