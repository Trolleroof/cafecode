import express from "express";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Store active projects in memory (since we don't need persistence)
const activeProjects = new Map();

// Helper function to robustly extract JSON from Gemini responses
const extractJsonFromResponse = (responseText) => {
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
function robustJsonParse(jsonString) {
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
    throw new Error('Invalid JSON from Gemini. Raw response: ' + jsonString);
  }
}

// Helper function to create project context from files
const createProjectContext = (projectFiles) => {
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
          (file.content.length > 100 ? file.content.substring(0, 100) + '...' : file.content) : 
          '[empty]';
        return `${prefix}📄 ${file.name} (${file.language || 'unknown'})\n${prefix}   Content: ${preview}\n`;
      }
    }).join('');
  };

  return `\n\nProject Structure and Files:\n${formatFiles(projectFiles)}`;
};

// Start a new guided project
router.post("/startProject", async (req, res) => {
  try {
    const { projectDescription, projectFiles } = req.body;

    if (!projectDescription) {
      return res.status(400).json({ error: "Project description is required" });
    }

    const projectId = uuidv4();
    const projectContext = createProjectContext(projectFiles);

    // Enhanced prompt for guided projects
    const prompt = `Create a step-by-step guide for the following project. Format the response as a JSON array of steps, where each step has:
- id: string (step number)
- instruction: string (clear, concise instruction for beginners)
- lineRanges: number[] (array of line numbers where code should be written)

Project: ${projectDescription}

${projectContext}

IMPORTANT GUIDELINES:
- The IDE is web-based. The user cannot run terminal or shell commands, install packages, or use a real OS shell. Only code editing, file management, and code execution for supported languages are supported.
- There is no terminal or command prompt in this IDE. Do NOT instruct the user to open a terminal or run shell/command-line commands. To run code, tell the user to press the green Run button in the IDE.
- Do NOT include steps that require a terminal, command prompt, or shell access.
- Make sure all instructions are actionable within the web-based IDE environment.
- ALWAYS start with step 1: "Create a folder called 'project-name' for your project" (this is a folder-only step)
- Step 2 should be about creating the main file (index.html for web projects, main.py for Python, etc.)
- Break down the steps into the smallest possible parts, assuming the user is a complete beginner
- For HTML projects, encourage creating separate style.css and main.js files for styling and scripting
- Guide users to link CSS and JavaScript files properly in HTML
- Use very simple, beginner-friendly language
- Each step should be achievable in 2-3 lines of code maximum
- Consider the existing project files when creating steps
- If no files exist, start with creating the basic file structures
- Reference specific files when relevant to the instructions
- Make sure folder creation steps come BEFORE file creation steps
- NEVER combine folder creation and file creation in the same step instruction
- Be specific about file names and content requirements
- For file creation steps, include what content should be in the file
- For code writing steps, be clear about what the code should do
- Make the steps as granular and detailed as possible, even if it results in 12-20 steps for a typical project. Err on the side of making more, smaller steps.
- If the solution involves a common algorithmic pattern (such as two pointers, sliding window, recursion, dynamic programming, etc.), explicitly mention the pattern in the relevant step(s) and explain what part of the pattern is being implemented in that step. Do this every time a new part of the pattern is coded.
- Use language like: "This step implements the first part of the two pointers pattern: initializing the pointers." or "Now, apply the sliding window pattern by moving the right pointer."
- Do not repeat the full pattern explanation in every step, but always reference the pattern and the sub-part being implemented.
- Emphasize that steps should be much smaller and more numerous than typical guides, and each step should be easy for a beginner to follow.
- Do NOT use markdown formatting, asterisks, bold, or italics in the step instructions. Only use plain text.

Example format:
[
  {
    "id": "1",
    "instruction": "Create a folder called 'my-website' for your project",
    "lineRanges": [1, 1]
  },
  {
    "id": "2",
    "instruction": "Create an HTML file called 'index.html' and add the basic HTML structure with head and body tags",
    "lineRanges": [1, 10]
  },
  {
    "id": "3", 
    "instruction": "Create a CSS file called 'style.css' for styling your webpage",
    "lineRanges": [1, 5]
  },
  {
    "id": "4",
    "instruction": "Add a heading to your HTML file that says 'Welcome to My Website'",
    "lineRanges": [1, 15]
  }
]

Make sure each step is clear, specific, and achievable. Focus on one task per step. If a step is part of a larger pattern, mention the pattern and what part of it is being implemented in that step. Use very beginner-friendly language throughout.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    let steps;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      steps = robustJsonParse(cleanResponse);

      // Validate the steps format
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error("Invalid steps format: not an array or empty array");
      }

      // Validate each step
      steps = steps.map((step, index) => ({
        id: String(index + 1),
        instruction: step.instruction || `Step ${index + 1}`,
        lineRanges: Array.isArray(step.lineRanges) ? step.lineRanges : [1, 3],
      }));
    } catch (parseError) {
      console.error("Error parsing Gemini response for steps:", parseError);
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse steps from AI response." });
    }

    activeProjects.set(projectId, {
      description: projectDescription,
      steps,
      currentStep: 0,
      projectFiles: projectFiles || []
    });

    // Construct project context string for Tavus
    const stepsList = steps.map((step, idx) => `${idx + 1}. ${step.instruction}`).join('\n');
    const tavusProjectContext = `Project Overview: ${projectDescription}\nSteps:\n${stepsList}`;

    // Send initial chat message
    const welcomeMessage = {
      type: "assistant",
      content: `I'll guide you through building: "${projectDescription}"\n\nLet's start with the first step:\n\n${steps[0].instruction}\n\nUse the "+" button in the file explorer to create folders and files as needed. Once you've completed a step, click "Check Step" to continue to the next step.`,
    };

    res.json({ projectId, steps, welcomeMessage, projectContext: tavusProjectContext });
  } catch (error) {
    console.error("Error starting project:", error);
    res.status(500).json({ error: "Failed to start project" });
  }
});

// Analyze current step
router.post("/analyzeStep", async (req, res) => {
  try {
    const { projectId, stepId, code, language, projectFiles } = req.body;

    console.log("AnalyzeStep called with:", { projectId, stepId, language, codeLength: code?.length });

    if (!projectId || !language) {
      return res.status(400).json({ error: "Missing required parameters: projectId and language" });
    }

    const project = activeProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Find the step by ID instead of using currentStep index
    const currentStep = project.steps.find(step => step.id === stepId);
    if (!currentStep) {
      console.error("Step not found:", { stepId, availableSteps: project.steps.map(s => ({ id: s.id, instruction: s.instruction })) });
      return res.status(404).json({ error: "Current step not found" });
    }

    console.log("Current step instruction:", currentStep.instruction);
    console.log("Current step ID:", currentStep.id);
    console.log("Code being analyzed (first 200 chars):", code.substring(0, 200) + (code.length > 200 ? "..." : ""));

    // Handle empty code case
    if (!code || code.trim() === '') {
      return res.json({
        feedback: [{
          line: 1,
          correct: false,
          suggestion: "Please add some code to this file. The file is currently empty."
        }],
        chatMessage: {
          type: "assistant",
          content: "The file is empty. Please add some code based on the step instruction and try checking again.",
        },
      });
    }

    // Use Gemini to analyze the code (NO project context)
    const prompt = `You are a supportive coding instructor analyzing a student's code for a specific step in a guided project.

IMPORTANT CONTEXT ABOUT THIS IDE:
- This is a web-based IDE with a built-in file explorer on the left side
- Users can create files using the "+" button in the file explorer
- File creation is handled separately by the IDE's file system
- Your job is ONLY to analyze the code content, not file structure
- The IDE automatically manages the file system - users don't need to create folders manually
- NEVER CHECK OR TALK ABOUT CREATING FILES - that's handled by the IDE
- Users may have completed previous steps and added extra content beyond the current step
- Focus on STRUCTURE and SYNTAX, not exact content or wording

Step Information:
- Step ID: ${currentStep.id}
- Instruction: ${currentStep.instruction}
- Expected Line Range: ${currentStep.lineRanges.join("-")}
- Language: ${language}

Student's Code:
\`\`\`${language}
${code}
\`\`\`

Your task is to analyze this code and determine if it correctly implements the step instruction. Be SUPPORTIVE and UNDERSTANDING in your assessment.

CRITICAL RULES:
1. NEVER mention file creation - that's handled by the IDE. 
2. Focus on CODE STRUCTURE and SYNTAX, not exact content or wording
3. If the step asks for a specific HTML element, check if that element type exists (e.g., if asking for a paragraph, check for <p> tags)
4. If the step asks for CSS styling, check if CSS rules are present and properly formatted
5. If the step asks for JavaScript functionality, check if the code structure is correct
6. Do NOT be overly strict about exact text content - focus on the structural requirements
7. Recognize that users may have added extra content or completed multiple steps
8. If the required structure/elements are present, mark as correct even if there's additional content
9. Be encouraging and supportive - this is for beginners
10. Consider that the user might have already implemented the requirement in a previous step
11. DO NOT ASK THE USER TO RUN ANY COMMANDS IN THE TERMINAL, THERE IS NO TERMINAL

EXAMPLES OF FLEXIBLE ANALYSIS:
- If step says "Add a paragraph about yourself", check for <p> tags with content (any content is fine)
- If step says "Add a heading that says 'Welcome'", check for any heading tag (<h1>, <h2>, etc.) with any text
- If step says "Create a CSS file", check for CSS rules (any rules are fine)
- If step says "Style the heading with red color", check for CSS that could make text red (color: red, color: #ff0000, etc.)
- If step says "Add another paragraph", check if there are multiple <p> tags present

EXAMPLES OF WHAT TO AVOID:
- Being strict about exact text content
- Requiring specific wording or phrases
- Marking as incorrect if extra content is present
- Not recognizing that requirements might already be met from previous work

Provide your analysis as a JSON array of objects. Each object should have:
- "line": number (the line number being analyzed, use 1 if analyzing the whole file)
- "correct": boolean (true if the code structure/elements match the step requirements)
- "suggestion": string (encouraging suggestion for improvement if incorrect, or "Great! Code structure matches step requirements." if correct)

Guidelines:
1. Be encouraging and supportive - this is for beginners
2. Focus on whether the code STRUCTURE matches the step instruction
3. If the required elements are present, mark as correct regardless of content
4. If the code has extra elements not required by the step, that's perfectly fine
5. Consider the programming language syntax and best practices
6. Keep suggestions specific and actionable
7. NEVER mention file creation - that's handled by the IDE
8. For HTML files, check if the required HTML elements are present (any content is fine)
9. For CSS files, check if the required CSS rules are present (any values are fine)
10. For JavaScript files, check if the required functionality structure is implemented
11. For Python files, check if the required code structure is present
12. If the step asks for specific tags or elements, check if those tags/elements exist
13. Don't worry about exact text content - focus on structural requirements

IMPORTANT: Mark as correct if the code STRUCTURE and ELEMENTS fulfill the step requirements. Be flexible about content and encouraging to beginners.`;

    console.log("Sending prompt to Gemini for analysis...");
    console.log("Full prompt being sent to Gemini:", prompt);
    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    console.log("Gemini response received, length:", responseText.length);
    
    let feedback;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      feedback = robustJsonParse(cleanResponse);
      console.log("Parsed feedback:", feedback);
    } catch (parseError) {
      console.error("Error parsing Gemini response for feedback:", parseError);
      console.error("Raw Gemini response:", responseText);
      
      // Fallback: provide basic feedback
      return res.json({
        feedback: [{
          line: 1,
          correct: false,
          suggestion: "There was an issue analyzing your code. Please make sure your code follows the step instruction and try again."
        }],
        chatMessage: {
          type: "assistant",
          content: "I had trouble analyzing your code. Please review the step instruction and make sure your code matches what's expected. You can try checking again or ask for a hint.",
        },
      });
    }

    if (!Array.isArray(feedback)) {
      console.error("Gemini returned invalid feedback format:", feedback);
      return res.json({
        feedback: [{
          line: 1,
          correct: false,
          suggestion: "The analysis returned an unexpected format. Please check your code against the step instruction."
        }],
        chatMessage: {
          type: "assistant",
          content: "I couldn't properly analyze your code. Please review the step instruction and make sure your code matches what's expected.",
        },
      });
    }

    // Validate feedback structure
    const validFeedback = feedback.filter(f => 
      typeof f === 'object' && 
      typeof f.line === 'number' && 
      typeof f.correct === 'boolean'
    );

    if (validFeedback.length === 0) {
      return res.json({
        feedback: [{
          line: 1,
          correct: false,
          suggestion: "The analysis didn't provide valid feedback. Please check your code against the step instruction."
        }],
        chatMessage: {
          type: "assistant",
          content: "I couldn't properly analyze your code. Please review the step instruction and make sure your code matches what's expected.",
        },
      });
    }

    // Generate a chat message based on the feedback
    let feedbackMessage = "";
    const allCorrect = validFeedback.every((f) => f.correct);

    if (allCorrect) {
      feedbackMessage = "Great job! Your code looks correct. You can proceed to the next step.";
    } else {
      feedbackMessage = "Let's review your code:\n\n";
      validFeedback.forEach((f) => {
        if (!f.correct) {
          feedbackMessage += `• Line ${f.line}: ${f.suggestion || 'Needs attention'}\n`;
        }
      });
      feedbackMessage += "\nMake these adjustments and try again!";
    }

    console.log("Sending analysis result:", { allCorrect, feedbackCount: validFeedback.length });

    res.json({
      feedback: validFeedback,
      chatMessage: {
        type: "assistant",
        content: feedbackMessage,
      },
    });
  } catch (error) {
    console.error("Error analyzing step:", error);
    res.status(500).json({ 
      error: "Failed to analyze step",
      feedback: [{
        line: 1,
        correct: false,
        suggestion: "An error occurred while analyzing your code. Please try again."
      }],
      chatMessage: {
        type: "assistant",
        content: "Sorry, there was an error analyzing your code. Please try again or ask for help.",
      }
    });
  }
});

// Project-specific chat
router.post("/project-chat", async (req, res) => {
  try {
    const { projectId, currentStep, history, projectFiles } = req.body;

    if (!projectId || !history) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const project = activeProjects.get(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectContext = createProjectContext(projectFiles || project.projectFiles);

    // Format chat history for Gemini
    const chatHistory = history
      .map(
        (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `You are a helpful coding assistant guiding a user through a project.\nCurrent step: ${project.steps[currentStep].instruction}\n\nChat history:\n${chatHistory}\n\nProvide a helpful, encouraging response that:\n1. Addresses the user's question\n2. Provides relevant guidance for the current step\n3. Uses markdown formatting for code blocks and important points\n4. Keeps the response concise and clear\n5. Consider the project context and files when providing guidance\n\nDO NOT include any additional text or markdown outside of the JSON object.\n\nFormat your response as a JSON object with a 'content' field.${projectContext}`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response for chat:", parseError);
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse chat response from AI." });
    }

    if (typeof formattedResponse.content !== "string") {
      console.error(
        "Gemini returned invalid chat content format:",
        formattedResponse
      );
      return res
        .status(500)
        .json({ error: "AI did not return valid chat content." });
    }

    res.json({
      response: {
        type: "assistant",
        content: formattedResponse.content,
      },
    });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Simple chat for non-guided users
router.post("/simple-chat", async (req, res) => {
  try {
    const { history, projectFiles, guidedProject, currentCode, currentLanguage } = req.body;
    if (!history) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const projectContext = createProjectContext(projectFiles);
    const guidedContext = guidedProject ? `\n\nCurrent Guided Project: ${guidedProject.steps[guidedProject.currentStep]?.instruction || 'No active step'}` : '';
    const codeContext = currentCode ? `\n\nCurrent Code (${currentLanguage}):\n${currentCode}` : '';

    // Format chat history for Gemini
    const chatHistory = history
      .map(
        (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `
    You are a helpful coding assistant designed specifically for beginners. Your responses should be:
    - Very simple and easy to understand
    - Encouraging and supportive
    - Focused on practical, actionable advice
    - Using beginner-friendly language without complex jargon
    
    ${guidedProject ? 'The user is currently working on a guided project. Provide context-aware help related to their current step.' : 'If the user asks for detailed help, encourage them to click the "Start Guided Project" button for a step-by-step experience.'}
    
    Consider the user's project files and current code when providing context-aware responses.
    
    Chat history:\n${chatHistory}
    
    ${projectContext}${guidedContext}${codeContext}
    
    Respond as a JSON object with a 'content' field.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    try {
      // Extract JSON from response (handles both raw JSON and markdown-wrapped JSON)
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error(
        "Error parsing Gemini response for simple chat:",
        parseError
      );
      console.error("Raw Gemini response:", responseText);
      return res
        .status(500)
        .json({ error: "Failed to parse chat response from AI." });
    }

    if (typeof formattedResponse.content !== "string") {
      console.error(
        "Gemini returned invalid chat content format:",
        formattedResponse
      );
      return res
        .status(500)
        .json({ error: "AI did not return valid chat content." });
    }

    res.json({
      response: {
        type: "assistant",
        content: formattedResponse.content,
      },
    });
  } catch (error) {
    console.error("Error processing simple chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Recap route: summarize what the user learned as bullet points
router.post("/recap", async (req, res) => {
  try {
    const { projectFiles, chatHistory, guidedProject, ideCapabilities } = req.body;
    const projectContext = createProjectContext(projectFiles);
    const chatContext = Array.isArray(chatHistory)
      ? chatHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : '';
    const stepsContext = guidedProject && guidedProject.steps
      ? guidedProject.steps.map((s, i) => `Step ${i + 1}: ${s.instruction}`).join('\n')
      : '';
    const capabilities = ideCapabilities || 'The IDE is web-based. It cannot run terminal or shell commands, install packages, or use a real OS shell. Only code editing, file management, and code execution for supported languages are supported.';

    const prompt = `You are a helpful coding mentor. Summarize what the user learned in this guided project as a concise list of bullet points in markdown (use - or * for each point).\n\nProject context:\n${projectContext}\n\nGuided steps:\n${stepsContext}\n\nChat history:\n${chatContext}\n\nIMPORTANT: ${capabilities}\n\nDo NOT mention anything about using a terminal, shell, or command prompt. Only include things the user could have learned in this web-based IDE.\n\nFormat your response as a markdown bullet list. Be specific, positive, and beginner-friendly.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    // Try to extract just the bullet list from markdown
    const bulletListMatch = responseText.match(/([-*] .+\n?)+/g);
    const recap = bulletListMatch ? bulletListMatch[0].trim() : responseText.trim();
    res.json({ recap });
  } catch (error) {
    console.error("Error generating recap:", error);
    res.status(500).json({ error: "Failed to generate recap" });
  }
});

export default router;