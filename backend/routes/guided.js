import express from "express";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to read the guided project prompt from guided_project_prompt.txt
const readGuidedProjectPrompt = () => {
  try {
    // Try relative to __dirname first
    const promptPath = path.join(__dirname, 'guided_project_prompt.txt');
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    // Fallback: try relative to current working directory
    try {
      const fallbackPath = path.join(process.cwd(), 'routes', 'guided_project_prompt.txt');
      return fs.readFileSync(fallbackPath, 'utf8');
    } catch (fallbackError) {
      console.error('Failed to read guided_project_prompt.txt:', error.message);
      console.error('Fallback also failed:', fallbackError.message);
      // Return a minimal fallback prompt
      return 'Create a step-by-step guide for the following coding task.';
    }
  }
};

// Read the prompt
const guidedProjectPrompt = readGuidedProjectPrompt();

const router = express.Router();

// Store active projects in memory (since we don't need persistence)
const activeProjects = new Map();
// Store guided setup sessions (per-user) for sequential questions
const setupSessions = new Map();
// Store chat sessions for question tracking
const chatSessions = new Map();

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

// Helper function to check if a file or folder exists in projectFiles
const checkFileExists = (projectFiles, targetName, type = 'file') => {
  if (!projectFiles || !Array.isArray(projectFiles)) {
    return false;
  }
  
  // Recursive function to search through the file tree
  const searchInFiles = (files, target) => {
    for (const file of files) {
      // Check if this is the file/folder we're looking for
      if (file.name === target) {
        // If we're looking for a folder, check that it's a folder
        if (type === 'folder' && file.type === 'folder') {
          return true;
        }
        // If we're looking for a file, check that it's a file
        if (type === 'file' && file.type !== 'folder') {
          return true;
        }
      }
      
      // If this is a folder, search inside it
      if (file.type === 'folder' && file.children) {
        if (searchInFiles(file.children, target)) {
          return true;
        }
      }
    }
    return false;
  };
  
  return searchInFiles(projectFiles, targetName);
};

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

// AI-powered extraction of creation intent (file/folder) and target name
async function aiExtractCreationIntent(geminiService, instruction, projectFiles) {
  const projectContext = createProjectContext(projectFiles);
  const prompt = `You are validating a beginner-friendly coding step instruction.

Your tasks:
1) Decide if the instruction asks the user to CREATE a file or folder (also called directory/dir)
2) If yes, extract:
   - creationType: "file" or "folder" (folder = directory)
   - targetName: exact name to create (include extension for files like index.html)
3) If not a creation instruction, mark isCreation: false
4) If it is creation but unclear/invalid, return an error and suggestion

Instruction: "${instruction}"

Project files and folders (tree):
${projectContext}

Return ONLY a JSON object with exactly these fields:
{
  "isCreation": true|false,
  "isValid": true|false,
  "creationType": "file"|"folder"|null,
  "targetName": string|null,
  "error": string|null,
  "suggestion": string|null
}

Rules:
- Treat words folder/directory/dir as the same (folder)
- Be strict: creation steps MUST include a concrete name
- If the instruction says something like "Name it 'test-project'", extract test-project
- If multiple names appear, choose the most likely one to be CREATED in this step
- If unclear, set isValid: false with a helpful suggestion like:
  "Please use: Create a folder called 'my-app'" or "Create a file called 'index.html'"`;

  try {
    const result = await geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    const clean = extractJsonFromResponse(responseText);
    const parsed = robustJsonParse(clean);
    // Basic shape safety
    return {
      isCreation: Boolean(parsed.isCreation),
      isValid: Boolean(parsed.isValid),
      creationType: parsed.creationType === 'file' || parsed.creationType === 'folder' ? parsed.creationType : null,
      targetName: typeof parsed.targetName === 'string' ? parsed.targetName : null,
      error: typeof parsed.error === 'string' ? parsed.error : null,
      suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : null,
    };
  } catch (e) {
    console.error('[AI Creation Intent] error:', e);
    // Conservative fallback
    return {
      isCreation: false,
      isValid: false,
      creationType: null,
      targetName: null,
      error: 'AI validation failed. Please try again.',
      suggestion: null,
    };
  }
}

// Start a new guided project
router.post("/startProject", async (req, res) => {
  try {
    const { projectDescription, projectFiles, steps: predefinedSteps } = req.body;

    if (!projectDescription) {
      return res.status(400).json({ error: "Project description is required" });
    }

    const projectId = uuidv4();
    const projectContext = createProjectContext(projectFiles);

    // If steps are provided from the setup/preview flow, use them directly
    let steps = null;
    if (Array.isArray(predefinedSteps) && predefinedSteps.length > 0) {
      steps = predefinedSteps.map((step, index) => ({
        id: String(index + 1),
        instruction: typeof step.instruction === 'string' ? step.instruction : `Step ${index + 1}`,
        lineRanges: Array.isArray(step.lineRanges) ? step.lineRanges : [1, 3],
      }));
    }

    // Enhanced prompt for guided projects
    const prompt = guidedProjectPrompt.replace('${projectDescription}', projectDescription).replace('${projectContext}', projectContext);

    // Check if this is a React project and provide special response
    // const isReactProject = /react|react\.js|reactjs/i.test(projectDescription);
    
    // if (isReactProject) {
    //   // For React projects, return a special response asking for more input
    //   const reactSteps = [
    //     {
    //       "id": "1",
    //       "instruction": "Please provide more specific details about your React project. What components, features, or functionality do you want to build? For example: 'I want to create a todo list app with add/delete functionality' or 'I want to build a simple counter component with increment/decrement buttons'.",
    //       "lineRanges": [1, 1]
    //     }
    //   ];
      
    //   const welcomeMessage = {
    //     type: "assistant",
    //     content: `I see you want to create a React project! 🚀\n\nTo provide you with the best step-by-step guidance, I need more specific details about what you want to build. Please describe:\n\n• What type of React application or component you want to create\n• What features or functionality you want to include\n• Any specific requirements or preferences\n\nFor example:\n• "I want to create a todo list app with add/delete functionality"\n• "I want to build a simple counter component with increment/decrement buttons"\n• "I want to create a React app that displays a list of users from an API"\n\nOnce you provide more details, I'll create a detailed step-by-step guide for your specific React project!`,
    //   };

    //   activeProjects.set(projectId, {
    //     description: projectDescription,
    //     steps: reactSteps,
    //     currentStep: 0,
    //     projectFiles: projectFiles || []
    //   });

    //   res.json({ projectId, steps: reactSteps, welcomeMessage, projectContext: projectDescription });
    //   return;
    // }

    if (!steps) {
      // --- Comment out Gemini prompt usage for new/similar problem generation (if any) ---
      // (No explicit similar problem generation found in this file, but if any Gemini prompt for new/similar, comment it out)
      const result = await req.geminiService.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      console.log("[Gemini RAW response]", responseText);
      let cleanResponse;
      try {
        cleanResponse = extractJsonFromResponse(responseText);
        console.log("[Gemini Extracted JSON for parsing]", cleanResponse);
        // More robust fallback: If the extracted string looks like a sequence of objects, wrap in array
        if (
          !cleanResponse.trim().startsWith('[') &&
          /^{[\s\S]*},\s*{[\s\S]*}$/.test(cleanResponse.trim())
        ) {
          cleanResponse = `[${cleanResponse}]`;
          console.log('[Gemini Fallback] Wrapped sequence of objects in array brackets.');
        }
        // If it starts with [ and ends with ], but parsing fails, try to repair
        try {
          steps = robustJsonParse(cleanResponse);
        } catch (e) {
          if (cleanResponse.trim().startsWith('[') && cleanResponse.trim().endsWith(']')) {
            // Attempt to repair: remove trailing commas
            let repaired = cleanResponse.replace(/,\s*\]/g, ']');
            try {
              steps = robustJsonParse(repaired);
              console.log('[Gemini Repair] Removed trailing comma before closing bracket.');
            } catch (e2) {
              // Attempt to filter out non-object lines
              let lines = cleanResponse.split('\n').filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
              if (lines.length > 0) {
                let joined = `[${lines.join(',')}]`;
                try {
                  steps = robustJsonParse(joined);
                  console.log('[Gemini Repair] Filtered to only object lines.');
                } catch (e3) {
                  throw e3;
                }
              } else {
                throw e2;
              }
            }
          } else {
            throw e;
          }
        }
        // Validate the steps format
        if (!Array.isArray(steps) || steps.length === 0) {
          throw new Error("Invalid steps format: not an array or empty array");
        }
        // Validate each step and reject if naming requirements are not met
        steps = steps.map((step, index) => {
          const instruction = step.instruction || `Step ${index + 1}`;
          
                                  // Check for folder creation steps without specific names
        if (/create.*folder/i.test(instruction) && !/'[^']+'/.test(instruction)) {
          throw new Error(`Step ${index + 1} is missing specific folder name. Must use format: "Create a folder called 'EXACT-NAME'"`);
        }
        
        // Check for file creation steps without specific names
        if (/create.*file/i.test(instruction) && !/'[^']+'/.test(instruction)) {
          throw new Error(`Step ${index + 1} is missing specific file name. Must use format: "Create a file called 'EXACT-NAME.EXTENSION'"`);
        }
        
        // Check for UI instruction language (reject steps that tell users how to use the IDE)
        if (/(click|select|press|use|navigate|open|go to|find|locate).*(button|menu|panel|explorer|interface|ui|\+|plus)/i.test(instruction)) {
          throw new Error(`Step ${index + 1} contains UI instructions. Focus on WHAT to create, not HOW to create it. Use format: "Create a folder called 'EXACT-NAME'"`);
        }
          
          return {
            id: String(index + 1),
            instruction,
            lineRanges: Array.isArray(step.lineRanges) ? step.lineRanges : [1, 3],
          };
        });
      } catch (parseError) {
        console.error("[Gemini Parsing Error]", parseError);
        console.error("[Gemini Problematic String]", typeof cleanResponse !== "undefined" ? cleanResponse : "(no cleanResponse)");
        return res.status(500).json({ error: "Failed to parse steps from AI response." });
      }
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

// --- Setup flow: initial follow-up questions ---
router.post('/setup/start', async (req, res) => {
  try {
    const { projectDescription, projectFiles } = req.body;
    if (!projectDescription) {
      return res.status(400).json({ error: 'Project description is required' });
    }
    
    const userId = req.user?.id || uuidv4();
    
    // Generate very simple, high-level questions only
    const projectContext = createProjectContext(projectFiles);
    // Use the clarifying questions guidelines from the prompt file
    const prompt = `You are collecting a few SIMPLE clarifying questions for a beginner.

Coding Task: ${projectDescription}
${projectContext}

***STRICT FORMAT REQUIREMENTS:***
- Return ONLY a JSON array of 3-4 strings. No markdown, no numbering, no extra text.

${guidedProjectPrompt.split('CLARIFYING QUESTIONS GUIDELINES:')[1].split('CODE ANALYSIS GUIDELINES:')[0]}

***EXAMPLE FORMAT:***
[
  "What is the main goal of your application in one sentence?",
  "What are the 2–3 must‑have features?",
  "Do you prefer a specific tech stack or tools (e.g., React, Next.js, Node, Python)?",
  "What kind of data or content will the app use (e.g., text, images, user input)?"
]

Return ONLY the JSON array.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    
    // Log the full Gemini response for debugging
    console.log("[SETUP] Full Gemini response:", responseText);
    
    let questions;
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
      console.log("[SETUP] Extracted JSON:", cleanResponse);
      questions = robustJsonParse(cleanResponse);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid questions format');
      }
      // NEW: Normalize questions so each item is a single clean question string
      const normalizeQuestions = (arr) => {
        const cleaned = [];
        arr.forEach((q) => {
          if (typeof q !== 'string') return;
          // Split on new lines to catch bulleted questions packed in one string
          q.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            // Remove leading list markers (e.g., '-', '*', '1.', '2)')
            const cleanedLine = trimmed.replace(/^[\-*\d\.\)]+\s*/, '').trim();
            if (cleanedLine) cleaned.push(cleanedLine);
          });
        });
        return cleaned;
      };
      questions = normalizeQuestions(questions);
      console.log("[SETUP] Normalized questions:", questions);
      // Limit to maximum 5 questions
      questions = questions.slice(0, 5);
    } catch (e) {
      console.error('Error generating questions, using fallback:', e);
      // Fallback to basic questions if AI generation fails
      questions = [
        'What are the must-have features for this project? List 2-4 features.',
        'Do you prefer a specific tech stack or framework (e.g., React, Vanilla JS, Python)?',
        'What will the app show or work with? Briefly describe the main data or content.'
      ];
    }

    setupSessions.set(userId, {
      description: projectDescription,
      projectFiles: projectFiles || [],
      questions,
      index: 0,
      answers: {}
    });
    
    const firstQuestion = questions[0];
    // Add introduction and first question
    const content = `I'll ask you ${questions.length} specific questions to better understand your project requirements. This will help me create the most accurate step-by-step guide for you.\n\n**Question 1 of ${questions.length}:**\n${firstQuestion}`;
    return res.json({ response: { type: 'assistant', content }, setupActive: true });
  } catch (error) {
    console.error('Error in setup/start:', error);
    return res.status(500).json({ error: 'Failed to start setup chat' });
  }
});

// --- Setup flow: continued chat without generating steps ---
router.post('/setup/chat', async (req, res) => {
  try {
    const { projectDescription, history, projectFiles } = req.body;
    if (!history || !projectDescription) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const userId = req.user?.id || 'anonymous';
    const session = setupSessions.get(userId);
    if (!session) {
      return res.status(400).json({ error: 'Setup session not found. Please restart the guided setup.' });
    }
    // Find last user message as the answer
    const reversed = [...history].reverse();
    const lastUser = reversed.find(m => m.type === 'user');
    const answer = lastUser?.content?.trim() || '';
    const currentIndex = session.index;
    
    console.log(`[SETUP] Processing question ${currentIndex + 1}/${session.questions.length}`);
    console.log(`[SETUP] User answer:`, answer);
    
    // Save answer
    const qKey = `q${currentIndex + 1}`;
    session.answers[qKey] = answer;
    // Advance to next question
    if (currentIndex + 1 < session.questions.length) {
      session.index = currentIndex + 1;
      const nextQuestion = session.questions[session.index];
      const questionNumber = session.index + 1;
      const totalQuestions = session.questions.length;
      setupSessions.set(userId, session);
      
      console.log(`[SETUP] Moving to question ${questionNumber}/${totalQuestions}:`, nextQuestion);
      
      // Generate a dynamic, encouraging acknowledgment for the user's answer
      let acknowledgment = `Got it, thanks! Let's move to the next question.`; // Fallback response
      try {
        const ackPrompt = `You are a friendly and encouraging coding mentor. A user has just answered a question to help define a project they want to build. Your task is to provide a short, positive, and conversational acknowledgment of their answer before you ask the next question.

- **Keep it concise:** 1-2 sentences maximum.
- **Be encouraging:** Use positive language (e.g., "Great choice!", "Perfect!", "That sounds like a solid plan.").
- **Acknowledge their answer specifically:** Briefly repeat or refer to their choice.
- **Do NOT ask another question.** Your only job is to give a brief, positive acknowledgment.
- **Do NOT return JSON.** Just return a raw string.

**Context:**
- **Initial Project Idea:** "${projectDescription}"
- **The Question You Asked:** "${session.questions[currentIndex]}"
- **The User's Answer:** "${answer}"

**Example based on a similar conversation:**
- User's Answer: "react js for the frontend"
- Your Acknowledgment: "Great choice! React is a powerful library for building modern web applications. We'll be sure to set up the project with that in mind."

Now, generate a response for the user's answer provided in the context.`;

        const result = await req.geminiService.model.generateContent(ackPrompt);
        const responseText = (await result.response).text();
        if (responseText.trim()) {
          acknowledgment = responseText.trim();
        }
        console.log('[SETUP] Generated Acknowledgment:', acknowledgment);
      } catch (e) {
        console.error('[SETUP] Error generating acknowledgment, using fallback:', e);
      }
      
      // Return both the acknowledgment and the next question, with a flag to delay the question
      return res.json({ 
        response: { type: 'assistant', content: acknowledgment }, 
        nextQuestion: {
          content: `**Question ${questionNumber} of ${totalQuestions}:**\n${nextQuestion}`,
          delay: 1000 // 1 second delay
        },
        setupActive: true 
      });
    }
    // Completed all questions
    session.index = session.questions.length;
    setupSessions.set(userId, session);
    
    console.log(`[SETUP] All questions completed. User answers:`, session.answers);
    
    const content = `Perfect! I've collected all the information I need. When you're ready, click "Submit and Continue" to generate your project steps!`;
    return res.json({ response: { type: 'assistant', content }, setupActive: false });
  } catch (error) {
    console.error('Error in setup/chat:', error);
    return res.status(500).json({ error: 'Failed to process setup chat' });
  }
});

// --- Clean up only user-modified steps ---
router.post('/steps/cleanup', async (req, res) => {
  try {
    const { projectDescription, originalSteps, modifiedSteps, projectFiles } = req.body;
    if (!projectDescription || !originalSteps || !modifiedSteps) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const projectContext = createProjectContext(projectFiles);
    
    // Create a map of original steps for comparison
    const originalStepsMap = new Map(originalSteps.map(step => [step.id, step]));
    
    // Find which steps were actually modified by comparing with originals
    const actuallyModifiedSteps = modifiedSteps.filter(step => {
      const original = originalStepsMap.get(step.id);
      return original && step.instruction !== original.instruction;
    });
    
    if (actuallyModifiedSteps.length === 0) {
      // No modifications, return original steps
      return res.json({ steps: originalSteps });
    }
    
    console.log(`[CLEANUP] Cleaning up ${actuallyModifiedSteps.length} modified steps`);
    
    const cleanupPrompt = `You are a coding instructor reviewing and polishing user-modified project steps. Your task is to clean up ONLY the modified steps while keeping the rest unchanged.

***STRICT FORMAT REQUIREMENT:***
Return ONLY a JSON array of steps [ ... ].

**Project Context:**
${projectDescription}
${projectContext}

**Original Steps (DO NOT CHANGE THESE):**
${originalSteps.map((step, i) => `${i + 1}. ${step.instruction}`).join('\n')}

**User-Modified Steps (ONLY CLEAN THESE):**
${actuallyModifiedSteps.map((step, i) => `${i + 1}. ${step.instruction}`).join('\n')}

**Your Task:**
1. Keep ALL original steps exactly as they are
2. ONLY clean up the user-modified steps to:
   - Improve clarity and grammar
   - Fix technical errors
   - Ensure they fit logically with the original steps
   - Maintain the user's intent and approach
3. Do NOT add new steps or change the fundamental structure
4. Ensure all steps work with Cafecode IDE constraints

**IMPORTANT:** Return the complete array with original steps unchanged and only the modified steps cleaned up.

Return the steps as a JSON array with id, instruction, and lineRanges.`;

    const result = await req.geminiService.model.generateContent(cleanupPrompt);
    const responseText = (await result.response).text();
    let cleanedSteps;
    
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
      cleanedSteps = robustJsonParse(cleanResponse);
      if (!Array.isArray(cleanedSteps)) throw new Error('Not an array');
      
      // Ensure all steps have proper structure
      cleanedSteps = cleanedSteps.map((s, i) => ({
        id: String(i + 1),
        instruction: s.instruction || `Step ${i + 1}`,
        lineRanges: Array.isArray(s.lineRanges) ? s.lineRanges : [1, 3],
      }));
      
      console.log(`[CLEANUP] Successfully cleaned up ${cleanedSteps.length} steps`);
      return res.json({ steps: cleanedSteps });
      
    } catch (e) {
      console.error('Error parsing cleaned steps:', e, responseText);
      return res.status(500).json({ error: 'Failed to clean up steps. Using original steps.' });
    }
    
  } catch (error) {
    console.error('Error in steps/cleanup:', error);
    return res.status(500).json({ error: 'Failed to clean up steps. Using original steps.' });
  }
});

// --- Generate steps from description + chat history ---
router.post('/steps/generate', async (req, res) => {
  try {
    const { projectDescription, history, projectFiles, userEditedSteps } = req.body;
    if (!projectDescription) {
      return res.status(400).json({ error: 'Project description is required' });
    }
    const projectContext = createProjectContext(projectFiles);
    const chatHistory = Array.isArray(history)
      ? history.map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      : '';
    // Include captured answers from setup session (if any)
    const userId = req.user?.id || 'anonymous';
    const session = setupSessions.get(userId);
    const answersSummary = session && session.answers ? Object.entries(session.answers).map(([key, value], index) => `Q${index + 1}: ${value}`).join('\n') : '';

    // If user provided steps, POLISH them instead of generating new ones
    if (Array.isArray(userEditedSteps) && userEditedSteps.length > 0) {
      try {
        const cleanupPrompt = `***STRICT FORMAT REQUIREMENT:***\nReturn ONLY a JSON array of steps [ ... ].\n\nPOLISH the provided steps for Cafecode IDE WITHOUT changing the total number of steps.\n- Keep exactly ${userEditedSteps.length} steps.\n- Preserve the original order as much as possible.\n- Only improve clarity, grammar, numbering (1..N), and ensure each step is small and actionable.\n- Follow Cafecode IDE constraints (use "+" button for files/folders, green "Run" button for execution).\n- IMPORTANT: Use built-in terminal for installing tools and libraries instead of manually creating files.\n- Use terminal commands like "npm init -y", "npm install express", "npx create-react-app", "pip install" etc.\n- Do NOT manually create package.json, requirements.txt, or other configuration files.\n- Do NOT require external terminals or system commands.\n\n🚨 STEP INSTRUCTION FORMAT RULES 🚨:\n- NEVER say "Open 'filename' and add the following code" - users are already in the file\n- NEVER say "Navigate to file" or "Go to file" - focus on content creation\n- NEVER say "Click the '+' button" or "Select 'New Folder'"\n- NEVER explain UI navigation or button clicking\n- Focus on WHAT to create, not HOW to create it\n\nCRITICAL NAMING REQUIREMENTS:\n- EVERY folder creation step MUST specify an exact folder name (e.g., "Create a folder called 'src'", NOT "Create a folder")\n- EVERY file creation step MUST specify an exact filename (e.g., "Create a file called 'index.html'", NOT "Create a file")\n- Use quotes around names for clarity: "Create a folder called 'components'", "Create a file called 'styles.css'"\n- NEVER create generic steps like "Create a folder" or "Create a file" without names\n- Folder names should be descriptive: 'src', 'components', 'styles', 'utils', 'assets', 'public', 'backend', 'frontend'\n- File names should include extensions: 'index.html', 'styles.css', 'script.js', 'main.py', 'server.js'\n\nProject idea:\n${projectDescription}\n\n${answersSummary ? `Specific answers from user:\n${answersSummary}\n\n` : ''}${projectContext}\n\nSteps to polish:\n${JSON.stringify(userEditedSteps)}\n\nReturn the polished steps as a JSON array.`;

        const result = await req.geminiService.model.generateContent(cleanupPrompt);
        const responseText = (await result.response).text();
        let cleaned;
        const clean = extractJsonFromResponse(responseText);
        cleaned = robustJsonParse(clean);
        if (!Array.isArray(cleaned)) throw new Error('Not an array');
        // Validate each step and reject if naming requirements are not met
        cleaned = cleaned.map((s, i) => {
          const instruction = s.instruction || `Step ${i + 1}`;
          
          // Check for folder creation steps without specific names
          if (/create.*folder/i.test(instruction) && !/'[^']+'/.test(instruction)) {
            throw new Error(`Step ${i + 1} is missing specific folder name. Must use format: "Create a folder called 'EXACT-NAME'"`);
          }
          
          // Check for file creation steps without specific names
          if (/create.*file/i.test(instruction) && !/'[^']+'/.test(instruction)) {
            throw new Error(`Step ${i + 1} is missing specific file name. Must use format: "Create a file called 'EXACT-NAME.EXTENSION'"`);
          }
          
          return {
            id: String(i + 1),
            instruction,
            lineRanges: Array.isArray(s.lineRanges) ? s.lineRanges : [1, 3],
          };
        });
        return res.json({ steps: cleaned });
      } catch (e) {
        console.error('Error polishing steps in steps/generate:', e);
        return res.status(500).json({ error: 'An error happened. Please try again.' });
      }
    }
    // Use the main prompt file with custom inputs
    const customPrompt = guidedProjectPrompt
      .replace('${projectDescription}', projectDescription)
      .replace('${projectContext}', projectContext)
      .replace('Coding Task:', `Coding Task:\n${projectDescription}\n\nSpecific answers from user:\n${answersSummary || 'No specific answers provided.'}\n\n`);
    const result = await req.geminiService.model.generateContent(customPrompt);
    const responseText = (await result.response).text();
    let steps;
    let cleanResponse;
    try {
      cleanResponse = extractJsonFromResponse(responseText);
      if (!cleanResponse.trim().startsWith('[')) {
        cleanResponse = `[${cleanResponse}]`;
      }
      steps = robustJsonParse(cleanResponse);
      if (!Array.isArray(steps)) throw new Error('Not an array');
      // Validate each step and reject if naming requirements are not met
      steps = steps.map((s, i) => {
        const instruction = s.instruction || `Step ${i + 1}`;
        
        // Check for folder creation steps without specific names
        if (/create.*folder/i.test(instruction) && !/'[^']+'/.test(instruction)) {
          throw new Error(`Step ${i + 1} is missing specific folder name. Must use format: "Create a folder called 'EXACT-NAME'"`);
        }
        
        // Check for file creation steps without specific names
        if (/create.*file/i.test(instruction) && !/'[^']+'/.test(instruction)) {
          throw new Error(`Step ${i + 1} is missing specific file name. Must use format: "Create a file called 'EXACT-NAME.EXTENSION'"`);
        }
        
        return {
          id: String(i + 1),
          instruction,
          lineRanges: Array.isArray(s.lineRanges) ? s.lineRanges : [1, 3],
        };
      });
    } catch (e) {
      console.error('Error parsing steps from generate:', e, responseText);
      return res.status(500).json({ error: 'An error happened. Please try again.' });
    }
    return res.json({ steps });
  } catch (error) {
    console.error('Error in steps/generate:', error);
    return res.status(500).json({ error: 'An error happened. Please try again.' });
  }
});

// --- Cleanup and validate user-edited steps ---
router.post('/steps/cleanup', async (req, res) => {
  try {
    const { projectDescription, steps, projectFiles } = req.body;
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'Steps are required' });
    }
    const projectContext = createProjectContext(projectFiles);
    // Use the main prompt file with custom inputs for cleanup
    const cleanupInstructions = `
***STRICT FORMAT REQUIREMENT:***
Return ONLY a JSON array of steps [ ... ].

Clean up and validate these user-edited steps for clarity, ordering, numbering (1..N), and IDE constraints. 
Fix grammar, ensure each step is small and actionable.

${guidedProjectPrompt.split('🚨 STEP INSTRUCTION FORMAT RULES 🚨:')[1].split('CRITICAL FILE/FOLDER NAMING REQUIREMENTS')[0]}

${guidedProjectPrompt.split('CRITICAL FILE/FOLDER NAMING REQUIREMENTS')[1].split('⚠️ CRITICAL VALIDATION RULES ⚠️:')[0]}

Coding Task: ${projectDescription}
${projectContext}

User-edited steps:
${JSON.stringify(steps)}

Return the cleaned steps as a JSON array.`;
    
    const result = await req.geminiService.model.generateContent(cleanupInstructions);
    const responseText = (await result.response).text();
    let cleaned;
    try {
      const clean = extractJsonFromResponse(responseText);
      cleaned = robustJsonParse(clean);
      if (!Array.isArray(cleaned)) throw new Error('Not an array');
      // Validate each step and reject if naming requirements are not met
      cleaned = cleaned.map((s, i) => {
        const instruction = s.instruction || `Step ${i + 1}`;
        
        // Check for folder creation steps without specific names
        if (/create.*folder/i.test(instruction) && !/'[^']+'/.test(instruction)) {
          throw new Error(`Step ${i + 1} is missing specific folder name. Must use format: "Create a folder called 'EXACT-NAME'"`);
        }
        
        // Check for file creation steps without specific names
        if (/create.*file/i.test(instruction) && !/'[^']+'/.test(instruction)) {
          throw new Error(`Step ${i + 1} is missing specific file name. Must use format: "Create a file called 'EXACT-NAME.EXTENSION'"`);
        }
        
        return {
          id: String(i + 1),
          instruction,
          lineRanges: Array.isArray(s.lineRanges) ? s.lineRanges : [1, 3],
        };
      });
    } catch (e) {
      console.error('Error cleaning steps:', e, responseText);
      return res.status(500).json({ error: 'An error happened. Please try again.' });
    }
    return res.json({ steps: cleaned });
  } catch (error) {
    console.error('Error in steps/cleanup:', error);
    return res.status(500).json({ error: 'An error happened. Please try again.' });
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

    // Use AI-powered validation to understand creation steps (file/folder) and target name
    try {
      const intent = await aiExtractCreationIntent(
        req.geminiService,
        currentStep.instruction,
        projectFiles || project.projectFiles || []
      );
      if (intent && intent.isCreation === true) {
        if (!intent.isValid) {
          return res.json({
            feedback: [{
              line: 1,
              correct: false,
              suggestion: intent.error || intent.suggestion || 'This step is unclear. Please specify the exact name to create.'
            }],
            chatMessage: {
              type: 'assistant',
              content: intent.suggestion || intent.error || 'Please specify the exact name (e.g., Create a folder called \"my-app\" or Create a file called \"index.html\").'
            }
          });
        }

        const creationType = intent.creationType === 'folder' ? 'folder' : 'file';
        const targetName = intent.targetName;

        if (!targetName) {
          return res.json({
            feedback: [{
              line: 1,
              correct: false,
              suggestion: 'Could not determine the name to create. Please specify it clearly.'
            }],
            chatMessage: {
              type: 'assistant',
              content: 'Please specify the exact name (e.g., Create a folder called \"my-app\" or Create a file called \"index.html\").'
            }
          });
        }

        const exists = checkFileExists(projectFiles, targetName, creationType);
        if (exists) {
          return res.json({
            feedback: [{
              line: 1,
              correct: true,
              suggestion: `Great job creating the ${creationType} '${targetName}'!`
            }],
            chatMessage: {
              type: 'assistant',
              content: `Perfect! You've successfully created the ${creationType} '${targetName}'. You can proceed to the next step.`
            }
          });
        }

        return res.json({
          feedback: [{
            line: 1,
            correct: false,
            suggestion: `Please create the ${creationType} '${targetName}' as instructed.`
          }],
          chatMessage: {
            type: 'assistant',
            content: `I don't see the ${creationType} '${targetName}' yet. Please create it using the file explorer.`
          }
        });
      }
    } catch (aiErr) {
      console.error('[analyzeStep] AI validation failed, falling back to code analysis:', aiErr);
      // continue to code analysis
    }
    
    // For code-related steps, use Gemini to analyze the code (NO project context)
    // Use the code analysis guidelines from the prompt file
    const prompt = `You are a supportive coding instructor analyzing a student's code for a specific step.

Step Information:
- Step ID: ${currentStep.id}
- Instruction: ${currentStep.instruction}
- Expected Line Range: ${currentStep.lineRanges.join("-")}
- Language: ${language}

Student's Code:
\`\`\`${language}
${code}
\`\`\`

Provide your analysis as a JSON array of objects. Each object should have:
- "line": number (the line number being analyzed, use 1 if analyzing the whole file)
- "correct": boolean (true if the code structure/elements match the step requirements)
- "suggestion": string (encouraging suggestion for improvement if incorrect, or "Great job!" if correct)

${guidedProjectPrompt.split('CODE ANALYSIS GUIDELINES:')[1].split('FEEDBACK AND CHAT GUIDELINES:')[0]}`;

    console.log("Sending prompt to Gemini for analysis...");
    console.log("Full prompt being sent to Gemini:", prompt);
    // --- Comment out Gemini prompt usage for new/similar problem generation (if any) ---
    // (No explicit similar problem generation found in this file, but if any Gemini prompt for new/similar, comment it out)
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

    const userId = req.user?.id || 'anonymous';
    const projectSessionKey = `${userId}-${projectId}`;
    
    // Get or create project chat session for question tracking
    let projectChatSession = chatSessions.get(projectSessionKey) || {
      questionCount: 0,
      conversationCount: 0,
      projectId: projectId
    };
    
    // Increment conversation count for each user message
    if (history.length > 0 && history[history.length - 1].type === 'user') {
      projectChatSession.conversationCount++;
    }

    // Find last user message for acknowledgment
    const reversed = [...history].reverse();
    const lastUser = reversed.find(m => m.type === 'user');
    const userMessage = lastUser?.content?.trim() || '';

    // Generate acknowledgment first
    let acknowledgment = "Great progress!";
    try {
      const ackPrompt = `Generate a short, encouraging acknowledgment (1-2 sentences max) for this user message in the context of a coding project: "${userMessage}"
      
      Current step: ${project.steps[currentStep].instruction}
      
      Make it:
      - Positive and supportive
      - Specific to their coding journey
      - Brief and natural
      - Encouraging their progress
      
      Examples:
      - "Nice work on that!"
      - "You're getting the hang of it!"
      - "That's exactly right!"
      - "Great thinking!"
      
      Return ONLY the acknowledgment text, no quotes or extra formatting.`;
      
      const ackResult = await req.geminiService.model.generateContent(ackPrompt);
      const ackResponseText = (await ackResult.response).text();
      if (ackResponseText.trim()) {
        acknowledgment = ackResponseText.trim();
      }
      console.log('[PROJECT-CHAT] Generated Acknowledgment:', acknowledgment);
    } catch (e) {
      console.error('[PROJECT-CHAT] Error generating acknowledgment, using fallback:', e);
    }

    const projectContext = createProjectContext(projectFiles || project.projectFiles);

    // Format chat history for Gemini
    const chatHistory = history
      .map(
        (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    const prompt = `You are a helpful coding assistant guiding a user through a project.
    Current step: ${project.steps[currentStep].instruction}
    
    Chat history:\n${chatHistory}
    
    ${projectContext}
    
    IMPORTANT: Your response should be in JSON format with THREE fields:
    {
      "content": "Your main helpful response with guidance for the current step",
      "hasQuestion": "true or false - whether you want to ask a follow-up question",
      "question": "If hasQuestion is true, include a specific follow-up question here"
    }
    
    Your response should:
    1. Address the user's question
    2. Provide relevant guidance for the current step
    3. Use markdown formatting for code blocks and important points
    4. Keep the response concise and clear
    5. Consider the project context and files when providing guidance
    
    Only set hasQuestion to true if:
    - The user seems stuck and needs clarification
    - You could provide better step-specific help with more context
    - There's a natural follow-up about the current step
    
    Keep questions specific to the current step and project.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response for project chat:", parseError);
      console.error("Raw Gemini response:", responseText);
      // Fallback to simple response
      formattedResponse = { 
        content: responseText,
        hasQuestion: false 
      };
    }

    if (typeof formattedResponse.content !== "string") {
      console.error("Gemini returned invalid project chat content format:", formattedResponse);
      return res.status(500).json({ error: "AI did not return valid chat content." });
    }

    // Handle follow-up question if present
    if (formattedResponse.hasQuestion === true || formattedResponse.hasQuestion === "true") {
      projectChatSession.questionCount++;
      chatSessions.set(projectSessionKey, projectChatSession);
      
      const questionNumber = projectChatSession.questionCount;
      const followUpQuestion = formattedResponse.question || "What would you like to clarify about this step?";
      
      // Return acknowledgment and delayed question
      return res.json({
        response: { type: "assistant", content: acknowledgment },
        nextQuestion: {
          content: `**Question ${questionNumber}:**\n\n${followUpQuestion}`,
          delay: 1500 // 1.5 second delay
        }
      });
    }

    // No follow-up question, just return the main response with acknowledgment prefix
    const fullResponse = `${acknowledgment}\n\n${formattedResponse.content}`;

    res.json({
      response: {
        type: "assistant",
        content: fullResponse,
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

    const userId = req.user?.id || 'anonymous';
    const projectContext = createProjectContext(projectFiles);
    const guidedContext = guidedProject ? `\n\nCurrent Guided Project: ${guidedProject.steps[guidedProject.currentStep]?.instruction || 'No active step'}` : '';
    const codeContext = currentCode ? `\n\nCurrent Code (${currentLanguage}):\n${currentCode}` : '';

    // Get or create chat session for question tracking
    let chatSession = chatSessions.get(userId) || {
      questionCount: 0,
      conversationCount: 0
    };
    
    // Increment conversation count for each user message
    if (history.length > 0 && history[history.length - 1].type === 'user') {
      chatSession.conversationCount++;
    }

    // Find last user message for acknowledgment
    const reversed = [...history].reverse();
    const lastUser = reversed.find(m => m.type === 'user');
    const userMessage = lastUser?.content?.trim() || '';

    // Generate acknowledgment first
    let acknowledgment = "Thanks for sharing that!";
    try {
      const ackPrompt = `Generate a short, encouraging acknowledgment (1-2 sentences max) for this user message: "${userMessage}"
      
      Make it:
      - Positive and supportive
      - Specific to what they said
      - Brief and natural
      - Like texting a friend
      
      Examples:
      - "That's a great approach!"
      - "Perfect! I can help with that."
      - "Good question! Let me explain."
      - "That makes total sense!"
      
      Return ONLY the acknowledgment text, no quotes or extra formatting.`;
      
      const ackResult = await req.geminiService.model.generateContent(ackPrompt);
      const ackResponseText = (await ackResult.response).text();
      if (ackResponseText.trim()) {
        acknowledgment = ackResponseText.trim();
      }
      console.log('[SIMPLE-CHAT] Generated Acknowledgment:', acknowledgment);
    } catch (e) {
      console.error('[SIMPLE-CHAT] Error generating acknowledgment, using fallback:', e);
    }

    // Format chat history for main response
    const chatHistory = history
      .map(
        (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    // Generate main response with potential follow-up question
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
    
    IMPORTANT: Your response should be in JSON format with TWO fields:
    {
      "content": "Your main helpful response",
      "hasQuestion": "true or false - whether you want to ask a follow-up question",
      "question": "If hasQuestion is true, include a specific follow-up question here"
    }
    
    Only set hasQuestion to true if:
    - The user seems to need clarification
    - You could provide better help with more context
    - There's a natural follow-up that would be genuinely helpful
    
    Keep questions specific and relevant. Don't ask just to ask.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    let formattedResponse;
    
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response for simple chat:", parseError);
      console.error("Raw Gemini response:", responseText);
      // Fallback to simple response
      formattedResponse = { 
        content: responseText,
        hasQuestion: false 
      };
    }

    if (typeof formattedResponse.content !== "string") {
      console.error("Gemini returned invalid chat content format:", formattedResponse);
      return res.status(500).json({ error: "AI did not return valid chat content." });
    }

    // Handle follow-up question if present
    if (formattedResponse.hasQuestion === true || formattedResponse.hasQuestion === "true") {
      chatSession.questionCount++;
      chatSessions.set(userId, chatSession);
      
      const questionNumber = chatSession.questionCount;
      const followUpQuestion = formattedResponse.question || "What would you like to explore next?";
      
      // Return acknowledgment and delayed question
      return res.json({
        response: { type: "assistant", content: acknowledgment },
        nextQuestion: {
          content: `**Question ${questionNumber}:**\n\n${followUpQuestion}`,
          delay: 1500 // 1.5 second delay
        }
      });
    }

    // No follow-up question, just return the main response with acknowledgment prefix
    const fullResponse = `${acknowledgment}\n\n${formattedResponse.content}`;
    
    res.json({
      response: {
        type: "assistant",
        content: fullResponse,
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
    const capabilities = ideCapabilities || 'The IDE is web-based. It supports a built-in terminal, code editing, file management, and code execution for supported languages.';

    const prompt = `You are a helpful coding mentor. Summarize what the user learned in this guided project as a concise list of bullet points in markdown (use - or * for each point).\n\nProject context:\n${projectContext}\n\nGuided steps:\n${stepsContext}\n\nChat history:\n${chatContext}\n\nIMPORTANT: ${capabilities}\n\nIf the project involved using the terminal, include points about how to use the terminal, run commands, install packages, and best practices for beginners. Mention how the terminal can be used for running scripts, installing packages (such as with npm, pip, etc.), or checking output, if relevant.\n\nAlso include points such as:\n- How to use the file explorer to create, rename, and delete files and folders.\n- How to use the terminal to run code, install packages, or check for errors.\n- The importance of saving files before running code.\n- How to read error messages and use them to debug code.\n- How to use the \"Run\" button and when to use the terminal instead.\n- How to switch between files and organize code in folders.\n- How to use code comments for documentation and clarity.\n- How to ask for help or use the chat/assistant features.\n- Best practices for writing clean, readable code.\n\nFormat your response as a markdown bullet list. Be specific, positive, and beginner-friendly.`;

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