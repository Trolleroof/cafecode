import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
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

Focus on syntax errors, logic bugs, performance issues, code style, security vulnerabilities, and readability. Consider the specific technology stack and best practices for that framework.`;
  }

  createFixPrompt(code, language, errorMessage, lineNumber = null, projectFiles = null, chatHistory = null) {
    const projectContext = this.createProjectContext(projectFiles);

    // Format last five chat messages if present
    let chatContext = '';
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      const lastFive = chatHistory.slice(-5);
      const formatted = lastFive
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      chatContext = `\n\nRecent Chat (last 5):\n${formatted}`;
    }

    return `Fix this ${language} code based on the error and recent user conversation context.

Error: ${errorMessage}
${lineNumber ? `Error at line: ${lineNumber}` : ''}
${chatContext}

Code:\n\`\`\`${language}
${code}
\`\`\`

${projectContext}

Return JSON:
{
  "fixed_code": "complete corrected code",
  "fixes_applied": [{"line_number": number, "original_code": "original", "fixed_code": "corrected", "explanation": "what changed"}],
  "explanation": "overall explanation"
}

Fix the specific error while preserving original structure and logic. Consider the specific technology stack and follow best practices for that framework.`;
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
        request.projectFiles,
        request.chatHistory || null
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

      // Build a deterministic summary of changes
      const fixes = Array.isArray(fixData.fixes_applied) ? fixData.fixes_applied : [];
      const changedLines = fixes
        .map(f => f && typeof f.line_number === 'number' ? f.line_number : null)
        .filter(n => Number.isInteger(n));
      const explanations = fixes
        .map(f => f && typeof f.explanation === 'string' ? f.explanation.trim() : '')
        .filter(Boolean);
      const uniqueLines = [...new Set(changedLines)].sort((a, b) => a - b);
      const summaryParts = [];
      summaryParts.push(`Applied ${fixes.length} ${fixes.length === 1 ? 'fix' : 'fixes'}.`);
      if (uniqueLines.length > 0) summaryParts.push(`Changed lines: ${uniqueLines.join(', ')}.`);
      if (explanations.length > 0) {
        const brief = explanations.slice(0, 5).join('; ');
        summaryParts.push(`Key changes: ${brief}.`);
      }
      const summary = summaryParts.join(' ');

      return {
        success: true,
        fixed_code: fixData.fixed_code || request.code,
        fixes_applied: fixData.fixes_applied || [],
        explanation: fixData.explanation || 'Code has been fixed',
        summary: summary || 'No specific changes identified.',
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
        summary: 'No changes applied due to an error.',
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

  // ===== LEETCODE-SPECIFIC METHODS =====

  async generateLeetCodeSteps(problemDescription, language) {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = `You are a LeetCode interview coach. Create a step-by-step coding guide for this coding problem.

Problem Description: ${problemDescription}
Programming Language: ${language}

Generate a structured response with:
1. A clear problem title and description
2. Difficulty level (Easy/Medium/Hard)
3. Step-by-step coding instructions, where each step tells the user exactly what code to write or modify. Do not include any steps that only ask the user to think, plan, or analyze. Do not provide explanations, hints, or conceptual steps—just the coding actions required to solve the problem, broken down into logical steps.

Return JSON:
{
  "problem": {
    "title": "Problem Title",
    "titleSlug": "problem-title-slug",
    "description": "Clear problem description with examples",
    "difficulty": "Easy|Medium|Hard",
    "exampleTestcases": "Input: [1, 2, 3]\nOutput: 6\n\nInput: [4, 5, 6]\nOutput: 15",
    "steps": [
      {
        "id": "step_1",
        "instruction": "Direct coding instruction for this step",
        "lineRanges": [1, 5]
      }
    ]
  },
  "welcomeMessage": {
    "type": "assistant",
    "content": "Welcome message explaining the problem and first step"
  }
}

Guidelines:
- Break the solution into EXACTLY 20 logical coding steps for comprehensive learning
- Each step must require the user to write or modify code
- Do NOT include any conceptual, planning, or thinking steps
- Do NOT provide hints or explanations
- Each step should be a direct coding instruction
- The titleSlug should be a URL-friendly version of the title (lowercase, hyphens instead of spaces)
- Include 2-3 example test cases in the exampleTestcases field
- Do NOT use markdown, HTML, or formatting characters (like **, *, backtick, or >) in any field. Only return valid JSON.`;       const result = await this.model.generateContent(prompt); //// Demo version: fixed to around 20 steps for comprehensive learning

      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const leetcodeData = this.robustJsonParse(cleanResponse);
      const executionTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        problem: leetcodeData.problem,
        welcomeMessage: leetcodeData.welcomeMessage,
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('LeetCode steps generation failed:', error.message);

      return {
        success: false,
        problem: null,
        welcomeMessage: {
          type: 'assistant',
          content: `Failed to generate LeetCode problem: ${error.message}`
        },
        execution_time: executionTime
      };
    }
  }

  async analyzeLeetCodeStep(code, language, stepInstruction, lineRanges, stepId) {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = `You are analyzing a student's code for a specific LeetCode problem step.

Step Information:
- Step ID: ${stepId}
- Instruction: ${stepInstruction}
- Expected Line Range: ${lineRanges.join('-')}
- Language: ${language}

Student's Code:
\`\`\`${language}
${code}
\`\`\`

Analyze if the code correctly implements this specific step. Focus on:
1. Does the code structure match the step requirements?
2. Is the logic correct for this step?
3. Are there any syntax errors?
4. Does it follow good coding practices?

Return JSON:
{
  "feedback": [
    {
      "line": number,
      "correct": boolean,
      "suggestion": "specific feedback for this line"
    }
  ],
  "chatMessage": {
    "type": "assistant",
    "content": "Encouraging feedback message about the step"
  }
}

Be encouraging and specific. If correct, congratulate and explain why. If incorrect, provide clear guidance.`;

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
        feedback: analysisData.feedback || [],
        chatMessage: analysisData.chatMessage || {
          type: 'assistant',
          content: 'Analysis completed.'
        },
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('LeetCode step analysis failed:', error.message);

      return {
        success: false,
        feedback: [{
          line: 1,
          correct: false,
          suggestion: `Analysis failed: ${error.message}`
        }],
        chatMessage: {
          type: 'assistant',
          content: 'Sorry, I couldn\'t analyze your code. Please try again.'
        },
        execution_time: executionTime
      };
    }
  }

  // Helper to convert HTML to markdown for LeetCode/Gemini problems
  htmlToMarkdown(html) {
    if (!html || typeof html !== 'string') return html;
    let md = html;
    // Paragraphs and line breaks
    md = md.replace(/<\/?p>/gi, '\n');
    // Bold and strong
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    // Italic and emphasis
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
    // Inline code
    md = md.replace(/<code>(.*?)<\/code>/gi, '`$1`');
    // Superscript (e.g., 10<sup>4</sup>)
    md = md.replace(/<sup>(.*?)<\/sup>/gi, '^$1^');
    // Unordered lists
    md = md.replace(/<ul[^>]*>/gi, '\n');
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/ul>/gi, '\n');
    // Pre/code blocks (LeetCode uses <pre> for examples)
    md = md.replace(/<pre[^>]*>/gi, '\n```\n');
    md = md.replace(/<\/pre>/gi, '\n```\n');
    // Remove any remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');
    // Collapse multiple newlines
    md = md.replace(/\n{3,}/g, '\n\n');
    // Trim
    return md.trim();
  }

  // Helper to format a LeetCode problem object for clarity and readability
  formatLeetCodeProblem(problem) {
    if (!problem || typeof problem !== 'object') return problem;
    // Format title
    if (typeof problem.title === 'string') {
      problem.title = problem.title.trim();
      if (problem.title.length > 0) {
        problem.title = problem.title[0].toUpperCase() + problem.title.slice(1);
      }
    }
    // Format description: convert HTML to markdown, add headers, etc.
    if (typeof problem.description === 'string') {
      let desc = this.htmlToMarkdown(problem.description);
      // Add Description header if not present
      if (!/^#+\s*Description/i.test(desc)) {
        desc = `### Description\n${desc}`;
      }
      // If examples exist, add Examples header
      if (problem.exampleTestcases && !/^#+\s*Examples?/im.test(desc)) {
        desc += '\n\n### Examples';
      }
      // If constraints exist, add Constraints header
      if (problem.constraints && Array.isArray(problem.constraints) && problem.constraints.length > 0 && !/^#+\s*Constraints?/im.test(desc)) {
        desc += '\n\n### Constraints';
        for (const c of problem.constraints) {
          desc += `\n- ${c}`;
        }
      }
      // If follow-up exists, add Follow-up header
      if (problem.followup && typeof problem.followup === 'string' && problem.followup.trim()) {
        desc += `\n\n### Follow-up\n${problem.followup.trim()}`;
      }
      problem.description = desc;
    }
    // Format steps: trim, capitalize, and make Gemini-generated steps more descriptive
    if (Array.isArray(problem.steps)) {
      problem.steps = problem.steps.map((step, idx) => {
        if (typeof step.instruction === 'string') {
          let instr = step.instruction.trim();
          if (instr.length > 0) {
            instr = instr[0].toUpperCase() + instr.slice(1);
          }
          // For Gemini-generated, add a rationale if not present
          if (!/\bthis step helps you\b/i.test(instr)) {
            instr += ` (This step helps you progress toward the solution.)`;
          }
          step.instruction = instr;
        }
        return step;
      });
    }
    // Format exampleTestcases: ensure markdown code blocks and bold labels, and convert HTML if needed
    if (typeof problem.exampleTestcases === 'string' && problem.exampleTestcases.trim()) {
      let ex = this.htmlToMarkdown(problem.exampleTestcases);
      // Split by double newlines (each test case block)
      const blocks = ex.trim().split(/\n\s*\n/);
      const formattedBlocks = blocks.map((block, i) => {
        // Bold Input/Output/Explanation and wrap in code block
        let formatted = block
          .replace(/(Input:)/gi, '**Input:**')
          .replace(/(Output:)/gi, '**Output:**')
          .replace(/(Explanation:)/gi, '**Explanation:**');
        // Wrap in code block if not already
        if (!/^```/m.test(formatted)) {
          formatted = '```\n' + formatted + '\n```';
        }
        return formatted;
      });
      problem.exampleTestcases = formattedBlocks.join('\n\n');
    }
    return problem;
  }

  async generateSimilarLeetCodeProblem(problemDescription) {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const prompt = `Based on this LeetCode problem, generate a similar problem with the same algorithmic patterns but different context.

Original Problem: ${problemDescription}

Create a new problem that:
1. Uses the same algorithmic approach/pattern
2. Has different context/story
3. Similar difficulty level
4. Tests the same core concepts

Return JSON:
{
  "problem": {
    "title": "New Problem Title",
    "titleSlug": "new-problem-title-slug",
    "description": "New problem description with examples",
    "difficulty": "Easy|Medium|Hard",
    "exampleTestcases": "Input: [1, 2, 3]\nOutput: 6\n\nInput: [4, 5, 6]\nOutput: 15",
    "steps": [
      {
        "id": "step_1",
        "instruction": "Direct coding instruction for this step",
        "lineRanges": [1, 5]
      }
    ]
  },
  "welcomeMessage": {
    "type": "assistant",
    "content": "Message introducing the new similar problem"
  }
}

Make it engaging and educational while maintaining the same learning objectives. The titleSlug should be a URL-friendly version of the title (lowercase, hyphens instead of spaces). Include NO MORE THAN 3 example test cases in the exampleTestcases field. Each step must require the user to write or modify code. Do NOT include any conceptual, planning, or thinking steps. Do NOT provide hints or explanations. Each step should be a direct coding instruction. Format the JSON and all fields for clarity and readability.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const similarProblemData = this.robustJsonParse(cleanResponse);

      // Limit the number of test cases to 3 if possible
      if (similarProblemData && similarProblemData.problem && typeof similarProblemData.problem.exampleTestcases === 'string') {
        // Split by double newlines (each test case block)
        const blocks = similarProblemData.problem.exampleTestcases.split(/\n\s*\n/);
        if (blocks.length > 3) {
          similarProblemData.problem.exampleTestcases = blocks.slice(0, 3).join('\n\n');
        }
      }

      // Format the Gemini-generated problem for clarity and readability
      if (similarProblemData && similarProblemData.problem) {
        similarProblemData.problem = this.formatLeetCodeProblem(similarProblemData.problem);
      }

      const executionTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        problem: similarProblemData.problem,
        welcomeMessage: similarProblemData.welcomeMessage,
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('Similar LeetCode problem generation failed:', error.message);

      return {
        success: false,
        problem: null,
        welcomeMessage: {
          type: 'assistant',
          content: `Failed to generate similar problem: ${error.message}`
        },
        execution_time: executionTime
      };
    }
  }

  async chatLeetCode(history, currentStepInstruction = null, currentCode = null, currentLanguage = null) {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new Error('Gemini service not initialized');
      }

      const chatHistory = history
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const contextInfo = currentStepInstruction 
        ? `\n\nCurrent Step: ${currentStepInstruction}`
        : '';

      const codeInfo = currentCode && currentLanguage
        ? `\n\nCurrent Code (${currentLanguage}):\n\`\`\`${currentLanguage}\n${currentCode}\n\`\`\``
        : '';

      const prompt = `You are a helpful LeetCode interview coach. Provide guidance and hints for coding interview problems.

Chat History:
${chatHistory}
${contextInfo}
${codeInfo}

Provide a helpful response that:
1. Addresses the user's question
2. Gives hints without giving away the complete solution
3. Encourages algorithmic thinking
4. Uses simple, beginner-friendly language
5. Relates to interview best practices

Return JSON:
{
  "response": {
    "type": "assistant",
    "content": "Your helpful response"
  }
}

Be encouraging and focus on teaching problem-solving approaches rather than just giving answers.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new Error('Empty response from Gemini AI');
      }

      const cleanResponse = this.extractJsonFromResponse(responseText);
      const chatData = this.robustJsonParse(cleanResponse);
      const executionTime = (Date.now() - startTime) / 1000;

      return {
        success: true,
        response: chatData.response || {
          type: 'assistant',
          content: 'I\'m here to help with your LeetCode practice!'
        },
        execution_time: executionTime
      };

    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      console.error('LeetCode chat failed:', error.message);

      return {
        success: false,
        response: {
          type: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        },
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
