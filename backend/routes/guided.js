import express from "express";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { UserFileService } from '../services/UserFileService.js';
import { staticCreationChecker } from '../services/StaticCreationChecker.js';
import { timeStamp } from "console";

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

// Function to read the AI creation intent prompt from ai_creation_intent_prompt.txt
const readAiCreationIntentPrompt = () => {
  try {
    // Try relative to __dirname first
    const promptPath = path.join(__dirname, 'ai_creation_intent_prompt.txt');
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    // Fallback: try relative to current working directory
    try {
      const fallbackPath = path.join(process.cwd(), 'routes', 'ai_creation_intent_prompt.txt');
      return fs.readFileSync(fallbackPath, 'utf8');
    } catch (fallbackError) {
      console.error('Failed to read ai_creation_intent_prompt.txt:', error.message);
      console.error('Fallback also failed:', fallbackError.message);
      // Return a minimal fallback prompt
      return 'Analyze if this instruction asks to create a file or folder.';
    }
  }
};

// Read the prompt
const guidedProjectPrompt = readGuidedProjectPrompt();

const router = express.Router();

// Test endpoint for static creation checker
router.post('/test-static-checker', async (req, res) => {
  try {
    const { instructions } = req.body;
    const userId = req.user.id;
    
    if (!instructions || !Array.isArray(instructions)) {
      return res.status(400).json({ error: 'Instructions array is required' });
    }
    
    const results = await staticCreationChecker.testInstructions(instructions, userId);
    
    res.json({
      success: true,
      ...results,
      diagnostics: staticCreationChecker.getDiagnostics(userId)
    });
  } catch (error) {
    console.error('Static checker test error:', error);
    res.status(500).json({ error: error.message });
  }
});
const setupSessions = new Map();
const chatSessions = new Map();
const analysisCache = new Map();
const activeProjects = new Map();
// In-memory cache for generated steps keyed by input signature
const stepsCache = new Map();

// Helper: stable stringify for signatures
function stableStringify(obj) {
  try {
    return JSON.stringify(obj, Object.keys(obj).sort());
  } catch (_) {
    // Fallback best-effort stringify
    return JSON.stringify(obj);
  }
}

// Helper: Create a cache key for step generation inputs
function makeStepsCacheKey({ userId, projectDescription, history, projectFiles }) {
  const trimmedDesc = String(projectDescription || '').trim();
  const hist = Array.isArray(history)
    ? history.map((m) => ({ t: m.type, c: m.content })).slice(-12) // last 12 msgs
    : [];
  const filesSig = Array.isArray(projectFiles)
    ? projectFiles.map((f) => ({ n: f.name, t: f.type })).slice(0, 50)
    : [];
  return stableStringify({ u: userId || 'anon', d: trimmedDesc, h: hist, f: filesSig });
}

// Fallback: Simple deterministic step generator when AI fails
function fallbackGenerateSteps(projectDescription, requestedCount = null) {
  const desc = String(projectDescription || '').toLowerCase();
  let type = 'generic';
  if (/react|react\.js|reactjs/.test(desc)) type = 'react';
  else if (/next\.js|nextjs/.test(desc)) type = 'next';
  else if (/express|node(\.js)?\b|api server/.test(desc)) type = 'node';
  else if (/python|flask|django/.test(desc)) type = 'python';
  else if (/vue/.test(desc)) type = 'vue';
  else if (/angular/.test(desc)) type = 'angular';

  const n = Math.max(2, Math.min(20, Number.isInteger(requestedCount) ? requestedCount : 10));

  const steps = [];
  const push = (instruction) => steps.length < n && steps.push({
    id: String(steps.length + 1),
    instruction,
    lineRanges: [1, 3],
  });

  // Ensure all creation steps use explicit names, no UI verbs, and no code blocks
  switch (type) {
    case 'react': {
      push("Create a folder called 'src'");
      push("Create a file called 'index.html' in 'src'");
      push("Create a file called 'main.jsx' in 'src'");
      push("Create a file called 'App.jsx' in 'src'");
      push("Create a folder called 'components' inside 'src'");
      push("Create a file called 'Button.jsx' in 'src/components'");
      push("Modify 'App.jsx' to render 'Button' with a click counter");
      push("Create a file called 'styles.css' in 'src'");
      push("Modify 'index.html' to mount the React app at 'root'");
      push("Modify 'main.jsx' to render 'App' into the 'root' element");
      break;
    }
    case 'next': {
      push("Create a folder called 'app'");
      push("Create a file called 'layout.tsx' in 'app'");
      push("Create a file called 'page.tsx' in 'app'");
      push("Create a folder called 'components' inside 'app'");
      push("Create a file called 'Header.tsx' in 'app/components'");
      push("Modify 'layout.tsx' to include the 'Header' component");
      push("Create a file called 'styles.css' in 'app'");
      push("Modify 'page.tsx' to display a welcome message");
      push("Create a folder called 'lib'");
      push("Create a file called 'utils.ts' in 'lib' with a helper function");
      break;
    }
    case 'node': {
      push("Create a file called 'server.js' at project root");
      push("Create a folder called 'routes'");
      push("Create a file called 'routes/health.js'");
      push("Modify 'server.js' to set up an HTTP server on port 3000");
      push("Modify 'routes/health.js' to export a health handler that returns JSON");
      push("Create a folder called 'controllers'");
      push("Create a file called 'controllers/home.js'");
      push("Modify 'server.js' to add a '/' route that uses the home controller");
      push("Create a file called 'README.md' with project instructions");
      push("Create a file called 'config.json' with a 'port' setting");
      break;
    }
    case 'python': {
      push("Create a folder called 'app'");
      push("Create a file called 'app/main.py'");
      push("Create a file called 'app/routes.py'");
      push("Modify 'app/main.py' to start a simple HTTP server on port 5000");
      push("Modify 'app/routes.py' to define a '/' route that returns JSON");
      push("Create a file called 'README.md' with run instructions");
      push("Create a file called 'config.json' with a 'debug' setting");
      push("Create a folder called 'tests'");
      push("Create a file called 'tests/test_basic.py'");
      push("Modify 'app/main.py' to read 'config.json' at startup");
      break;
    }
    case 'vue': {
      push("Create a folder called 'src'");
      push("Create a file called 'index.html' in 'src'");
      push("Create a file called 'main.js' in 'src'");
      push("Create a file called 'App.vue' in 'src'");
      push("Create a folder called 'components' inside 'src'");
      push("Create a file called 'HelloWorld.vue' in 'src/components'");
      push("Modify 'App.vue' to render 'HelloWorld' with a prop");
      push("Create a file called 'styles.css' in 'src'");
      push("Modify 'index.html' to include a 'div' with id 'app'");
      push("Modify 'main.js' to mount the app to '#app'");
      break;
    }
    case 'angular': {
      push("Create a folder called 'src'");
      push("Create a file called 'index.html' in 'src'");
      push("Create a folder called 'app' inside 'src'");
      push("Create a file called 'app/app.module.ts' in 'src'");
      push("Create a file called 'app/app.component.ts' in 'src'");
      push("Create a file called 'app/app.component.html' in 'src'");
      push("Modify 'app/app.component.ts' to define a title property");
      push("Modify 'app/app.component.html' to show the title");
      push("Create a file called 'styles.css' in 'src'");
      push("Modify 'index.html' to bootstrap the Angular app");
      break;
    }
    default: {
      push("Create a folder called 'src'");
      push("Create a file called 'index.html' in 'src'");
      push("Create a file called 'styles.css' in 'src'");
      push("Create a file called 'script.js' in 'src'");
      push("Modify 'index.html' to include 'styles.css' and 'script.js'");
      push("Create a folder called 'components' inside 'src'");
      push("Create a file called 'components/widget.js' in 'src'");
      push("Modify 'script.js' to render a greeting to the page");
      push("Create a file called 'README.md' with usage notes");
      push("Create a file called 'config.json' with an 'env' setting");
    }
  }

  // If fewer than n steps defined for a type, pad with generic code-modification steps
  while (steps.length < n) {
    push(`Modify 'README.md' to document step ${steps.length + 1}`);
  }

  return steps;
}

// Helper: try Gemini with basic retry, then fallback
async function generateStepsWithFallback(req, { projectDescription, history, projectFiles, userEditedSteps, requestedCount }) {
  const userId = req.user?.id || 'anonymous';
  const cacheKey = makeStepsCacheKey({ userId, projectDescription, history, projectFiles });
  if (stepsCache.has(cacheKey)) {
    return { steps: stepsCache.get(cacheKey), source: 'cache' };
  }

  // Attempt Gemini up to 2 tries
  const tryGemini = async () => {
    const projectContext = createProjectContext(projectFiles);
    const chatHistory = Array.isArray(history)
      ? history.map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      : '';
    const session = setupSessions.get(userId);
    const answersSummary = session && session.answers
      ? Object.entries(session.answers).map(([key, value], index) => `Q${index + 1}: ${value}`).join('\n')
      : '';

    if (Array.isArray(userEditedSteps) && userEditedSteps.length > 0) {
      const cleanupPrompt = `***STRICT FORMAT REQUIREMENT:***\nReturn ONLY a JSON array of steps [ ... ].\n\nPOLISH the provided steps for Cafecode IDE WITHOUT changing the total number of steps.\n- Keep exactly ${userEditedSteps.length} steps.\n- Preserve the original order as much as possible.\n- Only improve clarity, grammar, numbering (1..N), and ensure each step is small and actionable.\n- Follow Cafecode IDE constraints (use "+" button for files/folders, green "Run" button for execution).\n- IMPORTANT: Use built-in terminal for installing tools and libraries instead of manually creating files.\n- Do NOT manually create package.json, requirements.txt, or other configuration files.\n- Do NOT require external terminals or system commands.\n\n🚨 STEP INSTRUCTION FORMAT RULES 🚨:\n- NEVER say "Open 'filename' and add the following code" - users are already in the file\n- NEVER say "Navigate to file" or "Go to file" - focus on content creation\n- NEVER say "Click the '+' button" or "Select 'New Folder'"\n- NEVER explain UI navigation or button clicking\n- Focus on WHAT to create, not HOW to create it\n\nCRITICAL NAMING REQUIREMENTS:\n- EVERY folder creation step MUST specify an exact folder name (e.g., "Create a folder called 'src'", NOT "Create a folder")\n- EVERY file creation step MUST specify an exact filename (e.g., "Create a file called 'index.html'", NOT "Create a file")\n- Use quotes around names for clarity: "Create a folder called 'components'", "Create a file called 'styles.css'"\n- NEVER create generic steps like "Create a folder" or "Create a file" without names\n- Folder names should be descriptive: 'src', 'components', 'styles', 'utils', 'assets', 'public', 'backend', 'frontend'\n- File names should include extensions: 'index.html', 'styles.css', 'script.js', 'main.py', 'server.js'\n\nProject idea:\n${projectDescription}\n\n${answersSummary ? `Specific answers from user:\n${answersSummary}\n\n` : ''}${projectContext}\n\nSteps to polish:\n${JSON.stringify(userEditedSteps)}\n\nReturn the polished steps as a JSON array.`;

      const result = await req.geminiService.model.generateContent(cleanupPrompt);
      const responseText = (await result.response).text();
      const clean = extractJsonFromResponse(responseText);
      let cleaned = robustJsonParse(clean);
      if (!Array.isArray(cleaned)) throw new Error('Not an array');
      cleaned = cleaned.map((s, i) => ({ id: String(i + 1), instruction: s.instruction || `Step ${i + 1}`, lineRanges: Array.isArray(s.lineRanges) ? s.lineRanges : [1, 3] }));
      return cleaned;
    }

    // Main generation prompt
    let customPrompt = guidedProjectPrompt
      .replace('${projectDescription}', projectDescription)
      .replace('${projectContext}', projectContext)
      .replace('Coding Task:', `Coding Task:\n${projectDescription}\n\nSpecific answers from user:\n${answersSummary || 'No specific answers provided.'}\n\n`);
    if (Number.isInteger(requestedCount)) {
      customPrompt += `\n\n🚨 CRITICAL STEP COUNT REQUIREMENT 🚨\nYou MUST return EXACTLY ${requestedCount} steps. No more, no fewer.\nIf you cannot complete the task in ${requestedCount} steps, you must break it down differently or combine steps to match the exact count.\nThis is NON-NEGOTIABLE - your response will be rejected if you don't return exactly ${requestedCount} steps.`;
    }
    const result = await req.geminiService.model.generateContent(customPrompt);
    const responseText = (await result.response).text();
    let cleanResponse = extractJsonFromResponse(responseText);
    if (!cleanResponse.trim().startsWith('[')) cleanResponse = `[${cleanResponse}]`;
    let steps = robustJsonParse(cleanResponse);
    if (!Array.isArray(steps)) throw new Error('Not an array');
    steps = steps.map((s, i) => ({ id: String(i + 1), instruction: s.instruction || `Step ${i + 1}`, lineRanges: Array.isArray(s.lineRanges) ? s.lineRanges : [1, 3] }));
    return steps;
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const aiSteps = await tryGemini();
      stepsCache.set(cacheKey, aiSteps);
      return { steps: aiSteps, source: 'ai' };
    } catch (e) {
      const msg = String(e?.message || e);
      console.warn(`[STEPS] AI attempt ${attempt + 1} failed: ${msg}`);
      if (/quota|429|Too Many Requests/i.test(msg)) {
        // If quota, stop retrying
        break;
      }
    }
  }

  // Fallback deterministic steps
  const steps = fallbackGenerateSteps(projectDescription, requestedCount);
  stepsCache.set(cacheKey, steps);
  return { steps, source: 'fallback' };
}

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
    throw new Error('Invalid JSON from Gemini. Raw response: ' + jsonString);
  }
}

// AI-first step judge: lets the model classify the step and verify completion using context
async function aiJudgeStep(geminiService, { instruction, projectContext, code, language, terminalOutput, chatHistory }) {
  if (!geminiService || !geminiService.model) {
    throw new Error('Gemini service unavailable');
  }

  const terminalText = Array.isArray(terminalOutput)
    ? terminalOutput.slice(-120).join('\n')
    : String(terminalOutput || '');

  const chatText = Array.isArray(chatHistory)
    ? chatHistory.map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`).slice(-8).join('\n')
    : '';

  const codeBlock = code ? `\n\nCODE (${language || 'text'}):\n\`\`\`${language || ''}\n${code}\n\`\`\`\n` : '';

  const prompt = `You are an automated step judge inside a web IDE. Determine what the current step expects and whether it is completed based on the provided context. Be decisive and practical.

INSTRUCTION:\n${instruction}

PROJECT CONTEXT (files and brief content previews):\n${projectContext}

TERMINAL (most recent lines):\n${terminalText}
${codeBlock}
RECENT CHAT:\n${chatText}

Respond ONLY as JSON with this exact schema (no markdown code fences):
{
  "kind": "navigate|install|terminal|file_create|file_modify|folder_create|clean_file|generic",
  "target": "string or null",
  "completed": true/false,
  "rationale": "short explanation of why",
  "hint": "one short next action or confirmation"
}

Rules:
- If the step is navigating folders, set kind=navigate and typically completed=true (no file changes required).
- If the step installs dependencies, set kind=install and infer completion from terminal logs (lenient).
- If the step asks to remove default code/styles, set kind=clean_file and consider empty/minimal content as completed.
- For file edits, set kind=file_modify and judge completion from provided code/content.
- Keep output concise.`;

  const result = await geminiService.model.generateContent(prompt);
  const responseText = (await result.response).text();
  const clean = extractJsonFromResponse(responseText);
  const parsed = robustJsonParse(clean);
  // Basic shape validation
  if (!parsed || typeof parsed !== 'object' || typeof parsed.completed !== 'boolean') {
    throw new Error('AI returned invalid shape');
  }
  return parsed;
}

const checkFileExists = (projectFiles, targetName, type = 'file', userId = null) => {
  // If we have a userId, try the static indexer first (much faster)
  if (userId) {
    try {
      const result = staticCreationChecker.enhancedFileExistsCheck(userId, targetName, type);
      console.log(`[CHECK_FILE_EXISTS] Static check for "${targetName}" (${type}): ${result}`);
      return result;
    } catch (error) {
      console.warn(`[CHECK_FILE_EXISTS] Static check failed, falling back to projectFiles: ${error.message}`);
    }
  }
  
  // Fallback to original logic with projectFiles
  if (!projectFiles || !Array.isArray(projectFiles)) {
    return false;
  }

  const normalizePath = (p) => String(p || '')
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();

  const normalizedTarget = normalizePath(targetName);
  const targetIsPath = normalizedTarget.includes('/');

  const searchInFiles = (files, currentPath = '') => {
    for (const node of files) {
      const nodeName = String(node.name || '').toLowerCase();
      const nodePathFromTree = currentPath ? `${currentPath}/${nodeName}` : nodeName;
      const nodePathFromId = normalizePath(node.id || node.path || node.fullPath || nodeName);

      const isFolder = node.type === 'folder';
      const isFile = !isFolder;

      const nodePathsToCheck = [normalizePath(nodePathFromTree)];
      if (nodePathFromId && nodePathFromId !== nodePathsToCheck[0]) {
        nodePathsToCheck.push(nodePathFromId);
      }

      const matchesTarget = nodePathsToCheck.some((np) => {
        if (targetIsPath) {
          return np === normalizedTarget || np.endsWith('/' + normalizedTarget);
        }
        return np.endsWith('/' + normalizedTarget) || np === normalizedTarget || nodeName === normalizedTarget;
      });

      if (matchesTarget) {
        if (type === 'folder' && isFolder) return true;
        if (type === 'file' && isFile) return true;
        // If type mismatches, continue searching
      }

      if (isFolder && Array.isArray(node.children) && node.children.length > 0) {
        if (searchInFiles(node.children, nodePathsToCheck[0])) {
          return true;
        }
      }
    }
    return false;
  };

  return searchInFiles(projectFiles);
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

// Extract likely file targets from an instruction string
function extractFileTargetsFromInstruction(instruction) {
  const targets = new Set();
  if (typeof instruction !== 'string' || !instruction) return [];
  // Quoted names first
  const quoted = instruction.match(/['"`]([\w\-\.\/\\]+)['"`]/g) || [];
  quoted.forEach((m) => {
    const clean = m.replace(/^['"`]|['"`]$/g, '');
    if (clean) targets.add(clean);
  });
  // Common file name patterns by extension
  const fileRegex = /([\w\-\/\\]+\.(?:js|ts|tsx|jsx|py|html|css|json|md|yaml|yml|txt|xml|php|rb|go|java|cpp|c|h))\b/gi;
  let match;
  while ((match = fileRegex.exec(instruction)) !== null) {
    targets.add(match[1]);
  }
  // Special no-dot names
  const special = instruction.match(/\b(dockerfile|makefile|readme)\b/gi) || [];
  special.forEach((name) => targets.add(name));
  return Array.from(targets).map((t) => String(t).replace(/^\.\//, ''));
}

// Helper function to check if a directory exists in project files
function checkDirectoryExists(projectFiles, directoryName) {
  if (!projectFiles || projectFiles.length === 0) return false;
  
  // Check if any file has a path that starts with the directory name
  return projectFiles.some(file => {
    const path = file.path || file.name || '';
    return path.startsWith(directoryName + '/') || path === directoryName;
  });
}

// Comprehensive step type analysis function
function analyzeStepType(instruction, projectFiles, userId = null) {
  const lowered = instruction.toLowerCase();
  
  // Check for terminal commands first
  const isTerminalCommand = /\b(run|open the terminal|execute|npm create|npx create|pip install|npm install)\b/i.test(instruction);
  
  if (isTerminalCommand) {
    // Handle specific terminal commands
    if (lowered.includes('npm create vite') || lowered.includes('npx create vite')) {
      // Extract the project name from the vite command
      const viteMatch = instruction.match(/npm create vite@latest\s+([^\s]+)/i) || instruction.match(/npx create vite@latest\s+([^\s]+)/i);
      const projectName = viteMatch ? viteMatch[1] : 'your-app-name';
      
      return {
        type: 'terminal-command',
        exists: checkDirectoryExists(projectFiles, projectName),
        targetName: projectName,
        requiresContent: false,
        commandType: 'vite-create'
      };
    }
    
    // Detect simple navigation steps like "cd crypto-tracker" or "navigate into 'crypto-tracker'"
    const cdMatch = instruction.match(/\bcd\s+([\w\-_.\/]+)/i);
    const navigateMatch = instruction.match(/navigate\s+(?:into|to|inside)\s+['"`]?(.*?)['"`]?\b/i);
    const navTarget = (cdMatch && cdMatch[1]) || (navigateMatch && navigateMatch[1]) || null;
    if (navTarget) {
      const clean = String(navTarget).replace(/^\.\//, '');
      return {
        type: 'terminal-command',
        exists: checkDirectoryExists(projectFiles, clean),
        targetName: clean,
        requiresContent: false,
        commandType: 'navigate'
      };
    }
    
    // Handle other terminal commands
    return {
      type: 'terminal-command',
      exists: false, // Terminal commands don't have file existence checks
      targetName: 'terminal-command',
      requiresContent: false,
      commandType: 'generic'
    };
  }
  
  // Intent detection patterns
  const isCreateIntent = /\b(create|make|new)\b/i.test(instruction);
  // Broaden modification verbs to better capture real-world phrasing
  const isModifyIntent = /\b(update|edit|modify|change|write|insert|replace|append|add|implement|remove|delete|clear|strip|cleanup|simplify|refactor|reset|erase)\b/i.test(instruction);
  // Strong signals that imply working with an existing file/content
  const strongModifySignal = /\b(open|remove|delete|clear|strip|cleanup|replace|simplify|refactor|reset|erase)\b/i.test(instruction);
  const hasModificationContext = /\b(to|with|in|inside|into)\b/i.test(instruction);
  const isExplicitFolderIntent = /(folder|directory|dir)\b/i.test(instruction);

  // Extract target names using comprehensive patterns
  const extractedNames = extractFileTargetsFromInstruction(instruction);
  
  // Add pattern-based extraction for better coverage
  const quotedNamePattern = /['"`]([\w\-\./\\]+)['"`]/g;
  let quotedMatches = [];
  let match;
  while ((match = quotedNamePattern.exec(instruction)) !== null) {
    quotedMatches.push(match[1]);
  }
  
  const creationPatterns = [
    /(?:create|make|new)\s+(?:a\s+)?(?:file|folder)?\s+(?:called|named)\s+['"`]?([\w\-\./\\]+)['"`]?/i,
    /(?:create|make|new)\s+['"`]?([\w\-\./\\]+)['"`]?/i,
    /(?:make|create)\s+(?:a\s+)?['"`]?([\w\-\./\\]+)['"`]?\s*(?:directory|folder)/i,
  ];
  
  const allExtractedNames = [...new Set([...extractedNames, ...quotedMatches])];
  creationPatterns.forEach(pattern => {
    const match = instruction.match(pattern);
    if (match && match[1]) {
      allExtractedNames.push(match[1]);
    }
  });

  console.log(`[ANALYZE STEP TYPE] Instruction: ${instruction}`);
  console.log(`[ANALYZE STEP TYPE] Extracted names: ${allExtractedNames.join(', ')}`);
  console.log(`[ANALYZE STEP TYPE] Intent: Create=${isCreateIntent}, Modify=${isModifyIntent}, Folder=${isExplicitFolderIntent}`);

  // Process each extracted name
  if (allExtractedNames.length > 0) {
    for (const name of allExtractedNames) {
      const cleanName = name.replace(/^['"``]|['"``]$/g, '').replace(/^\.\//, '');
      const hasFileExtension = /\.([\w]+)$/.test(cleanName);
      const isLikelyFile = hasFileExtension || /^(dockerfile|makefile|readme)$/i.test(cleanName);
      
      const fileExists = checkFileExists(projectFiles, cleanName, 'file', userId);
      const folderExists = checkFileExists(projectFiles, cleanName, 'folder', userId);
      
      console.log(`[ANALYZE STEP TYPE] Checking "${cleanName}": file=${fileExists}, folder=${folderExists}, isLikelyFile=${isLikelyFile}`);
      
      // Prefer modification when the instruction clearly implies editing an existing file
      if (isLikelyFile && (isModifyIntent || strongModifySignal || (hasModificationContext && !isCreateIntent))) {
        return {
          type: 'file-modify',
          exists: fileExists,
          targetName: cleanName,
          requiresContent: true,
          modifySignal: true
        };
      }

      // Prioritize creation semantics next
      if (isCreateIntent) {
        if (isExplicitFolderIntent && !isLikelyFile) {
          return {
            type: 'folder',
            exists: folderExists,
            targetName: cleanName,
            requiresContent: false,
            modifySignal: false
          };
        }
        return {
          type: 'file-create',
          exists: fileExists,
          targetName: cleanName,
          requiresContent: false,
          modifySignal: false
        };
      }
      
      // Then check for modification
      if (isLikelyFile && (isModifyIntent || hasModificationContext)) {
        return {
          type: 'file-modify',
          exists: fileExists,
          targetName: cleanName,
          requiresContent: true,
          modifySignal: isModifyIntent || strongModifySignal
        };
      }
      
      // File reference
      if (isLikelyFile) {
        return {
          type: 'file-reference',
          exists: fileExists,
          targetName: cleanName,
          requiresContent: false,
          modifySignal: false
        };
      }
    }
  }
  
  // Fallback logic
  if (isCreateIntent) {
    if (isExplicitFolderIntent) {
      return {
        type: 'folder',
        exists: false,
        targetName: 'required folder',
        requiresContent: false
      };
    } else {
      return {
        type: 'file-create',
        exists: false,
        targetName: 'new file',
        requiresContent: false
      };
    }
  }
  
  // Default to generic - requires content analysis
  return {
    type: 'generic',
    exists: true,
    targetName: null,
    requiresContent: true,
    modifySignal: isModifyIntent || strongModifySignal
  };
}

// Helper function to check if a file/folder exists in projectFiles tree
function checkFileExistsInProjectTree(projectFiles, targetName, type = 'file') {
  if (!projectFiles || !Array.isArray(projectFiles)) {
    return false;
  }
  
  const searchInFiles = (files) => {
    for (const file of files) {
      if (file.name === targetName && file.type === type) {
        return true;
      }
      if (file.children && file.children.length > 0) {
        if (searchInFiles(file.children)) {
          return true;
        }
      }
    }
    return false;
  };
  
  return searchInFiles(projectFiles);
}

// Validate step completion based on type and requirements
// Lenient terminal check for dependency installs
function wasDependencyInstalledFromLogs(instruction = '', terminalOutput = []) {
  try {
    const logs = Array.isArray(terminalOutput) ? terminalOutput.join('\n').toLowerCase() : String(terminalOutput || '').toLowerCase();
    if (!logs) return false;

    // Look for common success markers
    const successMarkers = [
      'added ', // e.g., added 5 packages
      'up to date',
      'audited ',
      'resolved',
      'installing',
      'installed ',
      'packages are looking for funding'
    ];

    const hasInstallAction = /\b(npm\s+(install|i)|yarn\s+add|pnpm\s+add)\b/.test(logs);
    const hasSuccess = successMarkers.some(m => logs.includes(m));

    // Try to extract explicit package names from the instruction and verify presence in logs (lenient)
    const pkgRegexes = [
      /npm\s+(?:install|i)\s+([^\n]+)/i,
      /yarn\s+add\s+([^\n]+)/i,
      /pnpm\s+add\s+([^\n]+)/i
    ];
    let pkgs = [];
    for (const r of pkgRegexes) {
      const m = instruction.match(r);
      if (m && m[1]) {
        pkgs = m[1].split(/\s+/).filter(Boolean).map(s => s.replace(/[,;]/g, ''));
        break;
      }
    }
    const packagesMentioned = pkgs.length === 0 || pkgs.some(p => logs.includes(p.toLowerCase()));

    return hasInstallAction && hasSuccess && packagesMentioned;
  } catch (_) {
    return false;
  }
}

function validateStepCompletion(stepType, targetName, projectFiles, code = '', instruction = '', terminalOutput = []) {
  console.log(`[VALIDATE STEP] Type: ${stepType.type}, Target: ${stepType.targetName}, Exists: ${stepType.exists}`);
  
  // Enhanced validation: if static checker says file doesn't exist, double-check with projectFiles tree
  let actualExists = stepType.exists;
  if (!actualExists && projectFiles && projectFiles.length > 0) {
    const existsInTree = checkFileExistsInProjectTree(projectFiles, targetName, stepType.type === 'file-create' ? 'file' : 'folder');
    if (existsInTree) {
      console.log(`[VALIDATE STEP] File found in projectFiles tree: ${targetName}`);
      actualExists = true;
    }
  }
  
  switch (stepType.type) {
    case 'terminal-command':
      if (stepType.commandType === 'vite-create') {
        if (actualExists) {
          return {
            completed: true,
            feedback: `Excellent! You've successfully created the React application '${stepType.targetName}' using Vite.`,
            suggestion: 'You can proceed to the next step.'
          };
        } else {
          return {
            completed: false,
            feedback: `Please run the terminal command to create the React application '${stepType.targetName}'.`,
            suggestion: 'Open the terminal and run the npm create vite command as instructed.'
          };
        }
      } else if (stepType.commandType === 'navigate') {
        // Be lenient: navigating doesn't change files; consider it complete.
        return {
          completed: true,
          feedback: stepType.exists
            ? `You're in good shape — the folder '${stepType.targetName}' exists. Navigation step acknowledged.`
            : `Navigation step acknowledged. If the folder '${stepType.targetName}' doesn't exist yet, you'll create it in a later step.`,
          suggestion: 'Proceed to the next step.'
        };
      } else {
        // Lenient dependency installation check using terminal history
        const looksLikeInstall = /\b(install|add)\b/i.test(instruction);
        const installed = wasDependencyInstalledFromLogs(instruction, terminalOutput);
        if (looksLikeInstall && installed) {
          return {
            completed: true,
            feedback: 'Dependency installation detected in terminal output.',
            suggestion: 'Great! You can proceed to the next step.'
          };
        }
        // Otherwise, defer to AI if needed
        return {
          completed: null, // Indicates need for AI analysis
          feedback: 'Terminal command execution detected',
          suggestion: 'AI will analyze the command execution'
        };
      }
    
    case 'folder':
      if (actualExists) {
        return {
          completed: true,
          feedback: `Great job! You've created the folder '${stepType.targetName}'.`,
          suggestion: 'You can proceed to the next step.'
        };
      } else {
        return {
          completed: false,
          feedback: `Please create the folder '${stepType.targetName}' before proceeding.`,
          suggestion: 'Use the "+" button in the file explorer to create a new folder.'
        };
      }
    
    case 'file-create':
      // If the instruction looked like a modification (e.g., "open", "remove", "replace"),
      // defer to AI content analysis instead of forcing a creation outcome.
      if (stepType.modifySignal) {
        return {
          completed: null,
          feedback: 'Content analysis required for this step',
          suggestion: 'AI will analyze the file contents to verify the change.'
        };
      }
      if (actualExists) {
        return {
          completed: true,
          feedback: `Perfect! You've created the file '${stepType.targetName}'.`,
          suggestion: 'You can proceed to the next step.'
        };
      } else {
        return {
          completed: false,
          feedback: `Please create the file '${stepType.targetName}' before proceeding.`,
          suggestion: 'Use the "+" button in the file explorer to create a new file.'
        };
      }
    
    case 'file-reference':
      if (actualExists) {
        return {
          completed: true,
          feedback: `Good! The file '${stepType.targetName}' exists.`,
          suggestion: 'You can proceed to the next step.'
        };
      } else {
        return {
          completed: false,
          feedback: `Please ensure the file '${stepType.targetName}' exists before proceeding.`,
          suggestion: 'Create the required file using the file explorer.'
        };
      }
    
    case 'file-modify':
      if (!actualExists) {
        return {
          completed: false,
          feedback: `The file '${stepType.targetName}' needs to be created or modified.`,
          suggestion: 'Create the file and add the required content.'
        };
      }
      // For modification steps, we need content analysis. However, if the
      // instruction asks to remove/clear content, an empty file can be valid.
      const isRemoval = /\b(remove|delete|clear|strip|cleanup|reset|erase)\b/i.test(instruction);
      if ((!code || code.trim() === '') && !isRemoval) {
        return {
          completed: false,
          feedback: 'Please add code to the file for this step.',
          suggestion: 'Open the file and add the required content based on the step instruction.'
        };
      }
      if (isRemoval) {
        // Treat empty-or-near-empty files as success for removal instructions.
        const compact = String(code || '').replace(/\s+/g, '');
        const isCss = typeof targetName === 'string' && /\.(css|scss|sass)$/i.test(targetName);
        const isTiny = compact.length === 0 || compact.length <= 4;
        const isMinimalCss = isCss && compact.length > 0 && compact.length <= 120; // allow tiny resets
        if (isTiny || isMinimalCss) {
          return {
            completed: true,
            feedback: `Looks good — '${stepType.targetName}' has been cleared as requested.`,
            suggestion: 'You can proceed to the next step.'
          };
        }
      }
      // This will require AI analysis for complex content validation
      return {
        completed: null, // Indicates need for AI analysis
        feedback: 'Content analysis required',
        suggestion: 'AI will analyze the code content'
      };
    
    case 'generic':
      // Generic steps always require AI content analysis
      return {
        completed: null, // Indicates need for AI analysis
        feedback: 'Content analysis required',
        suggestion: 'AI will analyze the code content'
      };
    
    default:
      return {
        completed: false,
        feedback: 'Unknown step type',
        suggestion: 'Please review the step instruction'
      };
  }
}

// Flatten projectFiles tree to a list of file-like objects: { name, path, content? }
function flattenProjectFilesTree(projectFiles) {
  const out = [];
  const walk = (nodes, base = '') => {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      const isFolder = n.type === 'folder' || n.isDirectory === true;
      const nodeName = n.name || '';
      const nodePath = n.id || n.path || (base ? `${base}/${nodeName}` : nodeName);
      if (isFolder) {
        if (n.children) walk(n.children, nodePath);
      } else {
        out.push({ name: nodeName, path: nodePath, content: n.content });
      }
    }
  };
  walk(projectFiles, '');
  return out;
}

// Pick the best match for a target name from a list of files (by ending match preference)
function pickBestFileMatch(target, files) {
  if (!target || !Array.isArray(files) || files.length === 0) return null;
  const loweredTarget = String(target).toLowerCase();
  let exact = files.find(f => f.path?.toLowerCase() === loweredTarget || f.name?.toLowerCase() === loweredTarget);
  if (exact) return exact;
  let ending = files.find(f => f.path?.toLowerCase().endsWith('/' + loweredTarget) || f.path?.toLowerCase().endsWith('\\' + loweredTarget));
  if (ending) return ending;
  let contains = files.find(f => f.path?.toLowerCase().includes(loweredTarget));
  return contains || null;
}

function languageFromFilename(filename) {
  const name = String(filename || '').toLowerCase();
  if (name.endsWith('.html')) return 'html';
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.md')) return 'markdown';
  if (name.endsWith('.ts')) return 'typescript';
  if (name.endsWith('.tsx')) return 'typescript';
  if (name.endsWith('.js')) return 'javascript';
  if (name.endsWith('.jsx')) return 'javascript';
  if (name.endsWith('.py')) return 'python';
  if (name.endsWith('.java')) return 'java';
  if (name.endsWith('.go')) return 'go';
  if (name.endsWith('.rb')) return 'ruby';
  if (name.endsWith('.php')) return 'php';
  if (name.endsWith('.xml')) return 'xml';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
  return 'plaintext';
}

// AI-powered extraction of creation intent (file/folder) and target name
async function aiExtractCreationIntent(geminiService, instruction, projectFiles) {
  const projectContext = createProjectContext(projectFiles);
  const prompt = readAiCreationIntentPrompt()
    .replace('${instruction}', instruction)
    .replace('${projectContext}', projectContext);

  try {
    const result = await geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    
    // Log the AI response to terminal
    process.stdout.write('\n🔍 [AI CREATION INTENT] Raw Response:\n');
    process.stdout.write(responseText);
    process.stdout.write('\n\n');
    
    const clean = extractJsonFromResponse(responseText);
    const parsed = robustJsonParse(clean);
    
    // Log the parsed result
    process.stdout.write('🔍 [AI CREATION INTENT] Parsed Result:\n');
    process.stdout.write(JSON.stringify(parsed, null, 2));
    process.stdout.write('\n\n');
    
    // Simple validation - trust the AI's analysis
    return {
      isCreation: Boolean(parsed.isCreation),
      isValid: Boolean(parsed.isValid),
      creationType: parsed.creationType || null,
      targetName: parsed.targetName || null,
      error: parsed.error || null,
      suggestion: parsed.suggestion || null,
    };
  } catch (e) {
    process.stdout.write(`\n❌ [AI CREATION INTENT] Error: ${e.message}\n\n`);
    // Conservative fallback
    return {
      isCreation: false,
      isValid: false,
      creationType: null,
      targetName: null,
      error: 'AI validation has failed. Please try again.',
      suggestion: null,
    };
  }
}

// Start a new guided project
import { ProfileService } from '../services/ProfileService.js';

router.post("/startProject", async (req, res) => {
  try {
    const { projectDescription, projectFiles, steps: predefinedSteps } = req.body;

    if (!projectDescription) {
      return res.status(400).json({ error: "Project description is required" });
    }

    // Get user ID from the authenticated request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if user has exceeded their free project limit
    try {
      // Read payment status and project_count from profiles
      const { data: profile, error: profileError } = await req.supabase
        .from('profiles')
        .select('has_unlimited_access, payment_status, project_count')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('Unable to read profile for paywall check:', profileError.message);
      }

      const hasUnlimited = Boolean(profile?.has_unlimited_access) || profile?.payment_status === 'paid';
      const currentCount = profile?.project_count ?? 0;

      if (!hasUnlimited && currentCount >= 1) {
        return res.status(402).json({ 
          error: 'Payment required',
          message: 'You\'ve completed your free project! Pay $4.99 to unlock unlimited projects.',
          needsPayment: true,
          currentProjectCount: currentCount
        });
      }
    } catch (error) {
      console.error('Error checking project limits:', error);
      // Continue with project creation if we can't check limits
    }

    const projectId = uuidv4();
    const projectContext = createProjectContext(projectFiles);

    // Parse step count from project description
    const parseStepCount = (description) => {
      // Look for numeric patterns: "4 steps", "four steps", "4", "four", etc.
      const numericMatch = description.match(/(\d+)\s*steps?/i);
      if (numericMatch) {
        const num = parseInt(numericMatch[1]);
        // Enforce minimum of 2 steps
        return Math.max(2, num);
      }
      
      // Look for written number patterns: "four steps", "ten steps", etc.
      const writtenNumbers = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
      };
      
      for (const [word, number] of Object.entries(writtenNumbers)) {
        if (description.toLowerCase().includes(`${word} steps`)) {
          // Enforce minimum of 2 steps
          return Math.max(2, number);
        }
      }
      
      // Look for standalone numbers that might indicate step count
      const standaloneMatch = description.match(/\b(\d{1,2})\b/);
      if (standaloneMatch) {
        const num = parseInt(standaloneMatch[1]);
        // Only use if it's a reasonable step count (2-50)
        if (num >= 2 && num <= 50) {
          return num;
        }
      }
      
      // Return null to indicate AI should determine step count
      return null;
    };

    const requestedStepCount = parseStepCount(projectDescription);
    console.log(`[STEP COUNT] Parsed step count: ${requestedStepCount} from description: "${projectDescription}"`);

    // If steps are provided from the setup/preview flow, use them directly
    let steps = null;
    if (Array.isArray(predefinedSteps) && predefinedSteps.length > 0) {
      steps = predefinedSteps.map((step, index) => ({
        id: String(index + 1),
        instruction: typeof step.instruction === 'string' ? step.instruction : `Step ${index + 1}`,
        lineRanges: Array.isArray(step.lineRanges) ? step.lineRanges : [1, 3],
      }));
    }

    // Enhanced prompt for guided projects with step count enforcement
    let prompt = guidedProjectPrompt.replace('${projectDescription}', projectDescription).replace('${projectContext}', projectContext);
    
    // Add step count requirement to the prompt
    if (requestedStepCount !== null) {
      // User specified a step count
      prompt += `\n\n🚨 CRITICAL STEP COUNT REQUIREMENT 🚨
You MUST return EXACTLY ${requestedStepCount} steps. No more, no fewer.
If you cannot complete the task in ${requestedStepCount} steps, you must break it down differently or combine steps to match the exact count.
This is NON-NEGOTIABLE - your response will be rejected if you don't return exactly ${requestedStepCount} steps.`;
    } else {
      // AI should determine appropriate step count
      prompt += `\n\n🚨 STEP COUNT REQUIREMENT 🚨
You must determine the appropriate number of steps for this project. Consider the complexity and scope of the task.
- Minimum: 2 steps
- Maximum: 50 steps
- Choose a number that provides clear, manageable steps for a beginner
- Make steps granular and detailed - err on the side of more, smaller steps rather than fewer, complex ones
- Each step should be achievable in 2-3 lines of code maximum
- Return exactly the number of steps you determine is appropriate for this project.`;
    }

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
      try {
        const { steps: genSteps, source } = await generateStepsWithFallback(req, {
          projectDescription,
          history: null,
          projectFiles,
          userEditedSteps: null,
          requestedCount: requestedStepCount,
        });
        steps = genSteps;
        console.log(`[START PROJECT] Steps generated via ${source}. Count=${steps.length}`);
      } catch (parseError) {
        console.error('[START PROJECT] Step generation failed, using deterministic fallback:', parseError?.message);
        steps = fallbackGenerateSteps(projectDescription, requestedStepCount);
      }
    }

    activeProjects.set(projectId, {
      description: projectDescription,
      steps,
      currentStep: 0,
      projectFiles: projectFiles || []
    });


    // Note: We increment project_count on project completion (not start)
    // to reflect completed projects and gate new projects after finishing.

    // Send initial chat message
    const welcomeMessage = {
      type: "assistant",
      content: `I'll guide you through building: "${projectDescription}"\n\nLet's start with the first step:\n\n${steps[0].instruction}\n\nUse the "+" button in the file explorer to create folders and files as needed. Once you've completed a step, click "Check" to continue to the next step.`,
    };

    res.json({ projectId, steps, welcomeMessage });
  } catch (error) {
    console.error("Error starting project:", error);
    res.status(500).json({ error: "Failed to start project" });
  }
});

// Mark guided project as completed and increment user's project count
router.post('/completeProject', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Accept data for summary generation
    const { projectId, projectFiles = [], chatHistory = [], guidedProject = null } = req.body || {};

    // 1) Increment project count via shared service
    const result = await ProfileService.incrementProjectCount(req.supabase, userId);
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to increment project count', details: result.error });
    }

    // 2) Generate recap summary (this is now the ONLY place that does it)
    const createProjectContext = (files) => {
      if (!Array.isArray(files)) return 'No project files available';
      return files
        .map(file => `${file.name} (${file.type}): ${file.content ? String(file.content).substring(0, 200) + '...' : 'Empty file'}`)
        .join('\n');
    };

    const projectContext = createProjectContext(projectFiles);
    const chatContext = Array.isArray(chatHistory)
      ? chatHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : '';
    const stepsContext = guidedProject && guidedProject.steps
      ? guidedProject.steps.map((s, i) => `Step ${i + 1}: ${s.instruction}`).join('\n')
      : '';
    const capabilities = 'The IDE (Cafecode) is web-based. It supports a built-in terminal, code editing, file management, and code execution for supported languages.';

    const numFiles = Array.isArray(projectFiles) ? projectFiles.length : 0;
    const numSteps = guidedProject?.steps?.length || 0;
    let desiredRecapPoints = 3;
    if (numSteps > 5) desiredRecapPoints++;
    if (numSteps > 10) desiredRecapPoints++;
    if (numFiles > 5) desiredRecapPoints++;
    if (numFiles > 10) desiredRecapPoints++;
    if (numSteps > 15 && numFiles > 15) desiredRecapPoints = 7;

    const prompt = `You are a coding mentor who helps students reflect on what they learned during their project.

Your student just completed a coding project and you want to summarize the specific skills and concepts they learned. Focus ONLY on concrete things they accomplished and learned to do by looking at the Guided steps, which is provided to you as part of the context.

IMPORTANT: Generate approximately ${desiredRecapPoints} bullet points, each with just 1 short sentence. Do NOT use emojis, markdown formatting, or bullet point symbols (- or *). Just write clean, simple text. Focus on what they learned to do, not their future potential or how promising they are.

Project context:
${projectContext}

Guided steps:
${stepsContext}

Chat history:
${chatContext}

IDE capabilities: ${capabilities}

Create approximately ${desiredRecapPoints} bullet points that summarize what you learned to do during this project. Each point should describe a specific skill, concept, or technique you learned. Keep it factual and focused on your learning outcomes.`;

    let recap = '';
    try {
      const resultRecap = await req.geminiService.model.generateContent(prompt);
      const responseText = (await resultRecap.response).text();
      const bulletListMatch = responseText.match(/([-*] .+\n?)+/g);
      recap = bulletListMatch ? bulletListMatch[0].trim() : responseText.trim();
    } catch (e) {
      console.warn('Recap generation failed, returning fallback:', e?.message);
      recap = 'Congratulations on completing your project! Review your steps and code to reinforce what you learned.';
    }

    return res.json({ success: true, project_count: result.count, projectId: projectId || null, recap });
  } catch (e) {
    console.error('completeProject error:', e);
    return res.status(500).json({ error: 'Failed to complete project' });
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
    

    
    let questions;
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
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
    const { projectDescription, history, projectFiles, terminalOutput } = req.body;
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
      

      
      // Generate a dynamic, encouraging acknowledgment for the user's answer
      let acknowledgment = `Got it, thanks! Let's move to the next question.`; // Fallback response
      try {
        const terminalContext = terminalOutput && Array.isArray(terminalOutput) && terminalOutput.length > 0 
          ? `\n\n**Terminal Output (last ${terminalOutput.length} lines):**\n${terminalOutput.join('\n')}` 
          : '';

        const ackPrompt = `You are a friendly and encouraging coding mentor. A user has just answered a question to help define a project they want to build. Your task is to provide a short, positive, and conversational acknowledgment of their answer before you ask the next question.

- **Keep it concise:** 1-2 sentences maximum.
- **Be encouraging:** Use positive language (e.g., "Great choice!", "Perfect!", "That sounds like a solid plan.").
- **Acknowledge their answer specifically:** Briefly repeat or refer to their choice.
- **Do NOT ask another question.** Your only job is to give a brief, positive acknowledgment.
- **Do NOT return JSON.** Just return a raw string.

**Context:**
- **Initial Project Idea:** "${projectDescription}"
- **The Question You Asked:** "${session.questions[currentIndex]}"
- **The User's Answer:** "${answer}"${terminalContext}

**Example based on a similar conversation:**
- User's Answer: "react js for the frontend"
- Your Acknowledgment: "Great choice! React is a powerful library for building modern web applications. We'll be sure to set up the project with that in mind."

Now, generate a response for the user's answer provided in the context.`;

        const result = await req.geminiService.model.generateContent(ackPrompt);
        const responseText = (await result.response).text();
        if (responseText.trim()) {
          acknowledgment = responseText.trim();
        }

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
    

    
    const content = `Great, I've collected all the information I need. When you're ready, click "Generate Steps" to generate your project steps!`;
    

    setTimeout(() => {
      return res.json({ 
        response: { type: 'assistant', content, timeStamp: new Date().toISOString() }, 
        setupActive: false 
      });
    }, 4000);
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

    // Infer requested count from the conversation
    const parseStepCountFromHistory = (h) => {
      if (!Array.isArray(h)) return null;
      for (const message of h) {
        if (message.type === 'user' && message.content) {
          const content = message.content.toLowerCase();
          const numericMatch = content.match(/(\d+)\s*steps?/i);
          if (numericMatch) {
            const num = parseInt(numericMatch[1]);
            if (num >= 2 && num <= 50) return num;
          }
          const writtenNumbers = {
            'twenty five': 25, 'twenty-five': 25, 'twenty four': 24, 'twenty-four': 24,
            'twenty three': 23, 'twenty-three': 23, 'twenty two': 22, 'twenty-two': 22,
            'twenty one': 21, 'twenty-one': 21, 'twenty': 20, 'nineteen': 19, 'eighteen': 18,
            'seventeen': 17, 'sixteen': 16, 'fifteen': 15, 'fourteen': 14, 'thirteen': 13,
            'twelve': 12, 'eleven': 11, 'ten': 10, 'nine': 9, 'eight': 8,
            'seven': 7, 'six': 6, 'five': 5, 'four': 4, 'three': 3, 'two': 2
          };
          for (const [word, number] of Object.entries(writtenNumbers)) {
            if (content.includes(`${word} steps`) || content.includes(`${word} step`)) {
              return number;
            }
          }
        }
      }
      return null;
    };

    const requestedCount = parseStepCountFromHistory(history);
    const { steps, source } = await generateStepsWithFallback(req, {
      projectDescription,
      history,
      projectFiles,
      userEditedSteps,
      requestedCount,
    });
    return res.json({ steps, source });
  } catch (error) {
    console.error('Error in steps/generate:', error);
    // As a last resort, return minimal generic steps so UI doesn't break
    const steps = fallbackGenerateSteps(req.body?.projectDescription, null);
    return res.json({ steps, source: 'fallback-last-resort' });
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

    // OPTIMIZATION: Response Caching - check if we have a result for this exact code
    const cacheKey = `${projectId}-${stepId}-${code}`; // Use the code itself as part of the key
    if (analysisCache.has(cacheKey)) {
      console.log(`[ANALYZE STEP] Returning cached result for project ${projectId}, step ${stepId}.`);
      return res.json(analysisCache.get(cacheKey));
    }

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
    console.log("Code being analyzed (first 200 chars):", code?.substring(0, 200) + (code && code.length > 200 ? "..." : ""));

    // Ensure we have projectFiles for analysis
    const filesForAnalysis = projectFiles || project.projectFiles || [];
    console.log(`[ANALYZE STEP] Using projectFiles with ${filesForAnalysis.length} items for analysis`);
    
    // PHASE 1: AI-first step judgement (model determines the step type and completion)
    try {
      const aiVerdict = await aiJudgeStep(req.geminiService, {
        instruction: currentStep.instruction,
        projectContext: createProjectContext(filesForAnalysis),
        code,
        language,
        terminalOutput: Array.isArray(req.body?.terminalOutput) ? req.body.terminalOutput : [],
        chatHistory: []
      });

      console.log('[ANALYZE STEP][AI] Verdict:', aiVerdict);

      const correct = !!aiVerdict.completed;
      const analysisType = aiVerdict.kind || 'ai-judgement';
      const targetName = aiVerdict.target || null;
      const rationale = aiVerdict.rationale || '';
      const hint = aiVerdict.hint || '';

      return res.json({
        feedback: [{ line: 1, correct, suggestion: correct ? (hint || 'Great work!') : (hint || 'Please follow the hint to complete this step.') }],
        chatMessage: { type: 'assistant', content: `${rationale}${hint ? `\n\n${hint}` : ''}` },
        analysisType,
        targetName,
        exists: correct
      });
    } catch (aiError) {
      console.warn('[ANALYZE STEP] AI-first judgement failed or was inconclusive. Falling back to static analysis. Reason:', aiError.message);
    }

    // PHASE 2: Static heuristics (fallback)
    const stepType = analyzeStepType(currentStep.instruction, filesForAnalysis, req.user.id);
    process.stdout.write("\n\n\n================ BACKEND STEP ANALYSIS (FALLBACK) ================\n");
    process.stdout.write(`Instruction: ${currentStep.instruction}\n`);
    process.stdout.write(`ProjectFiles count: ${filesForAnalysis.length}\n`);
    process.stdout.write(`Step Type Analysis: ${JSON.stringify(stepType, null, 2)}\n`);
    process.stdout.write("===============================================================\n\n\n");

    const validation = validateStepCompletion(
      stepType,
      stepType.targetName,
      filesForAnalysis,
      code,
      currentStep.instruction,
      Array.isArray(req.body?.terminalOutput) ? req.body.terminalOutput : []
    );

    console.log(`[ANALYZE STEP] Validation result (fallback):`, validation);

    if (validation.completed !== null) {
      return res.json({
        feedback: [{ line: 1, correct: validation.completed, suggestion: validation.feedback }],
        chatMessage: { type: 'assistant', content: `${validation.feedback} ${validation.suggestion}` },
        analysisType: stepType.type,
        targetName: stepType.targetName,
        exists: stepType.exists
      });
    }

    // PHASE 3: AI-powered content analysis for complex cases
    console.log(`[ANALYZE STEP] Requires AI content analysis for: ${stepType.type}`);

    // Fallback to AI creation intent analysis for unclear creation steps
    // Skip this when the instruction strongly suggests a modification to an existing file
    if ((stepType.type === 'generic' || stepType.type === 'file-create') && !stepType.modifySignal) {
      try {
        // Phase 3a: Try static analysis first (faster, no AI cost)
        console.log(`\n⚡ [ANALYZE STEP] Trying static analysis for step: "${currentStep.instruction}"`);
        
        const staticResult = await staticCreationChecker.analyzeCreationIntent(
          currentStep.instruction,
          req.user.id,
          filesForAnalysis
        );

        let intent;
        
        // If static analysis is confident enough, use it
        if (!staticResult.requiresAI) {
          console.log(`\n✅ [ANALYZE STEP] Static analysis successful, skipping AI`);
          intent = staticResult;
        } else {
          // Phase 3b: Fallback to AI for complex cases
          console.log(`\n🔍 [ANALYZE STEP] Static analysis requires AI fallback: ${staticResult.reason}`);
          
          intent = await aiExtractCreationIntent(
            req.geminiService,
            currentStep.instruction,
            filesForAnalysis
          );

        }
        
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
                content: intent.suggestion || intent.error || 'Please specify the exact name (e.g., Create a folder called "my-app" or Create a file called "index.html").'
              },
              analysisType: 'invalid-creation',
              targetName: null,
              exists: false
            });
          }

          // Trust the AI's classification
          const creationType = intent.creationType;
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
                content: 'Please specify the exact name (e.g., Create a folder called "my-app" or Create a file called "index.html").'
              },
              analysisType: 'unclear-creation',
              targetName: null,
              exists: false
            });
          }

          const exists = checkFileExists(projectFiles, targetName, creationType, req.user.id);
          
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
              },
              analysisType: creationType === 'file' ? 'file-create' : 'folder',
              targetName: targetName,
              exists: true
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
            },
            analysisType: creationType === 'file' ? 'file-create' : 'folder',
            targetName: targetName,
            exists: false
          });
        }
      } catch (aiErr) {
        console.error('[analyzeStep] AI validation failed, falling back to code analysis:', aiErr);
        // continue to code analysis
      }
    }

    // Attempt to auto-select a target file if code is empty
    let effectiveCode = code;
    let effectiveLanguage = language;
    if (!effectiveCode || effectiveCode.trim() === '') {
      try {
        let flatFiles = [];
        if (Array.isArray(projectFiles) && projectFiles.length > 0) {
          flatFiles = flattenProjectFilesTree(projectFiles);
        } else if (req.user?.id) {
          const scan = await UserFileService.scanPath(req.user.id, '.', { recursive: true, includeContent: true, maxBytes: 65536, ignoreHidden: true });
          if (scan && Array.isArray(scan.files)) {
            flatFiles = scan.files
              .filter(f => !f.isDirectory)
              .map(f => ({ name: f.name.split('/').pop(), path: f.name, content: f.content }));
          }
        }
        const targets = extractFileTargetsFromInstruction(currentStep.instruction);
        let chosen = null;
        for (const t of targets) {
          chosen = pickBestFileMatch(t, flatFiles);
          if (chosen) break;
        }
        if (chosen && (!chosen.content || typeof chosen.content !== 'string')) {
          try {
            const userId = req.user?.id;
            if (userId) {
              const data = await UserFileService.readFileSynced(userId, chosen.path);
              chosen.content = data;
            }
          } catch {}
        }
        if (chosen && typeof chosen.content === 'string') {
          effectiveCode = chosen.content;
          effectiveLanguage = languageFromFilename(chosen.path);
        }
      } catch (autoErr) {
        console.warn('[analyzeStep] Auto-select of target file failed:', autoErr.message);
      }
    }

    // Handle empty code case (after creation intent check and auto-selection)
    if (!effectiveCode || effectiveCode.trim() === '') {
      return res.json({
        feedback: [{
          line: 1,
          correct: false,
          suggestion: "Please add some code to a relevant file for this step."
        }],
        chatMessage: {
          type: "assistant",
          content: "I couldn't find code to analyze. Please open or create the relevant file and add code based on the step instruction, then try again.",
        },
        analysisType: 'empty-file',
        exists: false
      });
    }
    
    // For code-related steps, use Gemini to analyze the code (NO project context)
    // OPTIMIZATION: Ultra-compact prompt to reduce tokens and improve speed.
    const prompt = `Analyze this instruction: "${currentStep.instruction}"
Analyze this code:
\`\`\`${effectiveLanguage}
${effectiveCode}
\`\`\`
Is the code correct for the instruction? Return ONLY a JSON array with one object: [{"line": 1, "correct": true/false, "suggestion": "brief, encouraging feedback"}]`;
    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();

    let feedback;
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
      feedback = robustJsonParse(cleanResponse);

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
        analysisType: 'parse-error',
        exists: false
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
        analysisType: 'invalid-format',
        exists: false
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
        analysisType: 'no-valid-feedback',
        exists: false
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



    const resultToCache = {
      feedback: validFeedback,
      chatMessage: {
        type: "assistant",
        content: feedbackMessage,
      },
      analysisType: 'content-analysis',
      exists: allCorrect
    };

    // OPTIMIZATION: Store the successful analysis result in the cache
    analysisCache.set(cacheKey, resultToCache);
    console.log(`[ANALYZE STEP] Caching result for project ${projectId}, step ${stepId}.`);

    res.json(resultToCache);
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
      },
      analysisType: 'system-error',
      exists: false
    });
  }
});

// Project-specific chat
// router.post("/project-chat", async (req, res) => {
//   try {
//     const { projectId, currentStep, history, projectFiles } = req.body;

//     if (!projectId || !history) {
//       return res.status(400).json({ error: "Missing required parameters" });
//     }

//     const project = activeProjects.get(projectId);
//     if (!project) {
//       return res.status(404).json({ error: "Project not found" });
//     }

//     const userId = req.user?.id || 'anonymous';
//     const projectSessionKey = `${userId}-${projectId}`;
    
//     // Get or create project chat session for question tracking
//     let projectChatSession = chatSessions.get(projectSessionKey) || {
//       questionCount: 0,
//       conversationCount: 0,
//       projectId: projectId
//     };
    
//     // Increment conversation count for each user message
//     if (history.length > 0 && history[history.length - 1].type === 'user') {
//       projectChatSession.conversationCount++;
//     }

//     // Find last user message for acknowledgment
//     const reversed = [...history].reverse();
//     const lastUser = reversed.find(m => m.type === 'user');
//     const userMessage = lastUser?.content?.trim() || '';

//     // Generate acknowledgment first
//     let acknowledgment = "Great progress!";
//     try {
//       const ackPrompt = `Generate a short, encouraging acknowledgment (1-2 sentences max) for this user message in the context of a coding project: "${userMessage}"
      
//       Current step: ${project.steps[currentStep].instruction}
      
//       Make it:
//       - Positive and supportive
//       - Specific to their coding journey
//       - Brief and natural
//       - Encouraging their progress
      
//       Examples:
//       - "Nice work on that!"
//       - "You're getting the hang of it!"
//       - "That's exactly right!"
//       - "Great thinking!"
      
//       Return ONLY the acknowledgment text, no quotes or extra formatting.`;
      
//       const ackResult = await req.geminiService.model.generateContent(ackPrompt);
//       const ackResponseText = (await ackResult.response).text();
//       if (ackResponseText.trim()) {
//         acknowledgment = ackResponseText.trim();
//       }
//       console.log('[PROJECT-CHAT] Generated Acknowledgment:', acknowledgment);
//     } catch (e) {
//       console.error('[PROJECT-CHAT] Error generating acknowledgment, using fallback:', e);
//     }

//     const projectContext = createProjectContext(projectFiles || project.projectFiles);

//     // Format chat history for Gemini
//     const chatHistory = history
//       .map(
//         (msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`
//       )
//       .join("\n");

//     const prompt = `You are a helpful coding assistant guiding a user through a project.
//     Current step: ${project.steps[currentStep].instruction}
    
//     Chat history:\n${chatHistory}
    
//     ${projectContext}
    
//     IMPORTANT: Your response should be in JSON format with ONE field:
//     {
//       "content": "Your main helpful response with guidance for the current step"
//     }
    
//     Your response should:
//     1. Address the user's question
//     2. Provide relevant guidance for the current step
//     3. Use markdown formatting for code blocks and important points
//     4. Keep the response concise and clear
//     5. Consider the project context and files when providing guidance`;

//     const result = await req.geminiService.model.generateContent(prompt);
//     const responseText = (await result.response).text();
//     let formattedResponse;
    
//     try {
//       const cleanResponse = extractJsonFromResponse(responseText);
//       formattedResponse = robustJsonParse(cleanResponse);
//     } catch (parseError) {
//       console.error("Error parsing Gemini response for project chat:", parseError);
//       console.error("Raw Gemini response:", responseText);
//       // Fallback to simple response
//       formattedResponse = { 
//         content: responseText
//       };
//     }

//     if (typeof formattedResponse.content !== "string") {
//       console.error("Gemini returned invalid project chat content format:", formattedResponse);
//       return res.status(500).json({ error: "AI did not return valid chat content." });
//     }

//     // Return the acknowledgment and main response
//     const fullResponse = `${acknowledgment}\n\n${formattedResponse.content}`;

//     res.json({
//       response: {
//         type: "assistant",
//         content: fullResponse,
//       },
//     });
//   } catch (error) {
//     console.error("Error processing chat:", error);
//     res.status(500).json({ error: "Failed to process chat" });
//   }
// });

// Rich project chat for active guided projects (no acknowledgments)
router.post("/project-chat", async (req, res) => {
  try {
    const { history, projectFiles, guidedProject, currentCode, currentLanguage, terminalOutput } = req.body || {};

    if (!guidedProject || typeof guidedProject !== 'object') {
      return res.status(400).json({ error: "Active guided project is required" });
    }

    const projectContext = createProjectContext(projectFiles);
    const chatContext = Array.isArray(history)
      ? history.map(m => `${m.type === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      : '';
    const stepIndex = Number(guidedProject.currentStep) || 0;
    const currentStepText = guidedProject.steps?.[stepIndex]?.instruction || 'No current step';
    const stepsList = Array.isArray(guidedProject.steps)
      ? guidedProject.steps.map((s, i) => `Step ${i + 1}: ${s.instruction}`).join('\n')
      : 'No steps available';
    const terminalContext = Array.isArray(terminalOutput) && terminalOutput.length > 0
      ? `\n\nTerminal (last ${terminalOutput.length} lines):\n${terminalOutput.join('\n')}`
      : '';
    const codeContext = currentCode ? `\n\nCurrent File (${currentLanguage || 'text'}):\n${currentCode.slice(0, 4000)}` : '';

    const prompt = `You are a focused coding assistant inside a web IDE. The user is actively working on a guided project. Answer the user's question directly with concrete help. Do NOT produce generic acknowledgments or filler.

PROJECT CONTEXT:\n${projectContext}

GUIDED STEPS:\n${stepsList}

CURRENT STEP:\n${currentStepText}
${terminalContext}
${codeContext}

CHAT (most recent first):\n${chatContext}

Instructions:
- Prioritize helping with the CURRENT STEP while still answering their question.
- If terminal shows an error, diagnose and provide exact commands or code fixes.
- If a command is needed, provide it in a fenced code block marked bash.
- If code is needed, provide minimal, copyable snippets.
- Keep responses concise, practical, and free of fluff.
- Use markdown; no emojis; no acknowledgments-only replies.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    const content = String(responseText || '').trim();
    if (!content) {
      return res.status(500).json({ error: 'Empty response from AI' });
    }

    return res.json({
      response: { type: 'assistant', content }
    });
  } catch (error) {
    console.error('Error in project-chat:', error);
    return res.status(500).json({ error: 'Failed to process project chat' });
  }
});

// Simple chat for non-guided users
router.post("/simple-chat", async (req, res) => {
  try {
    const { history, projectFiles, guidedProject, currentCode, currentLanguage, terminalOutput } = req.body;
    if (!history) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const userId = req.user?.id || 'anonymous';
    const projectContext = createProjectContext(projectFiles);
    const guidedContext = guidedProject ? `\n\nCurrent Guided Project: ${guidedProject.steps[guidedProject.currentStep]?.instruction || 'No active step'}` : '';
    const codeContext = currentCode ? `\n\nCurrent Code (${currentLanguage}):\n${currentCode}` : '';
    const terminalContext = terminalOutput && Array.isArray(terminalOutput) && terminalOutput.length > 0 
      ? `\n\nTerminal Output (last ${terminalOutput.length} lines):\n${terminalOutput.join('\n')}` 
      : '';

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
      const ackPrompt = `Generate a warm, encouraging 1-sentence acknowledgment for this user message: "${userMessage}"

${terminalContext}

The acknowledgment should:
- Be genuinely enthusiastic and supportive
- Acknowledge their input specifically
- Use varied, engaging language
- Feel personal and conversational
- Be under 12 words maximum

Examples of good acknowledgments:
- "That's brilliant thinking!"
- "Love that idea!"
- "Excellent point!"
- "That makes perfect sense!"
- "Great insight!"
- "Smart approach!"
- "Perfect! I'm excited about this!"
- "That's exactly what we need!"

SPECIAL CASE: If the user mentions "Cannot find module 'ajv/dist/compile/codegen'" or similar AJV errors, respond with:
"I see you're getting an AJV module error! This is a common issue with dependency versions. Here's how to fix it:

**Run this command in your terminal:**
\`\`\`bash
npm install --save-dev ajv@^7
\`\`\`

After running the install command, try running your code again!"

TERMINAL ERROR HANDLING: If there are terminal errors in the context, acknowledge them specifically:
- "I see there's a terminal error - let me help fix that!"
- "I notice the terminal output shows an issue - let's solve it!"
- "I can see the error in your terminal - here's the solution!"

IMPORTANT: Do NOT use emojis in your response. Keep it text-only.

Avoid generic responses like "Thanks" or "Good idea". Make it feel like you're genuinely excited about their input.`;
      
      const ackResult = await req.geminiService.model.generateContent(ackPrompt);
      const ackResponseText = (await ackResult.response).text();
      if (ackResponseText.trim()) {
        acknowledgment = ackResponseText.trim();
      }
      console.log('[SIMPLE-CHAT] Generated Acknowledgment:', acknowledgment);
    } catch (e) {
      console.error('[SIMPLE-CHAT] Error generating acknowledgment, using fallback:', e);
    }

    // Just return the acknowledgment - no main response needed
    res.json({
      response: {
        type: "assistant",
        content: acknowledgment,
      },
    });
  } catch (error) {
    console.error("Error processing simple chat:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
});

// Follow-up suggestions route: generate AI-powered follow-up suggestions
router.post("/followup", async (req, res) => {
  try {
    const { projectDescription, chatHistory, projectFiles } = req.body;
    if (!projectDescription) {
      return res.status(400).json({ error: 'Project description is required' });
    }

    const projectContext = createProjectContext(projectFiles);
    const chatContext = Array.isArray(chatHistory)
      ? chatHistory.map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')
      : '';

    const prompt = `You are a helpful coding mentor helping a user refine their project. Based on their project description and chat history, suggest 2-3 specific follow-up questions or improvements they could consider.

Project description: ${projectDescription}

Chat history: ${chatContext}

Project context: ${projectContext}

Generate 2-3 follow-up suggestions that would help the user:
1. Clarify their project requirements
2. Add useful features or functionality
3. Improve their project structure or approach
4. Consider edge cases or improvements

Format your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "type": "clarification|feature|improvement|edgecase",
      "question": "The specific question or suggestion",
      "explanation": "Brief explanation of why this would be helpful"
    }
  ],
  "summary": "A brief summary encouraging the user to consider these suggestions"
}

Make the suggestions specific, actionable, and relevant to their project. Don't be generic.`;

    const result = await req.geminiService.model.generateContent(prompt);
    const responseText = (await result.response).text();
    
    let formattedResponse;
    try {
      const cleanResponse = extractJsonFromResponse(responseText);
      formattedResponse = robustJsonParse(cleanResponse);
    } catch (parseError) {
      console.error("Error parsing Gemini response for follow-up:", parseError);
      console.error("Raw Gemini response:", responseText);
      // Fallback to simple response
      formattedResponse = { 
        suggestions: [
          {
            type: "improvement",
            question: "What specific features would you like to add to your project?",
            explanation: "This will help us create more targeted and useful steps."
          }
        ],
        summary: "Consider what additional functionality would make your project more complete."
      };
    }

    res.json(formattedResponse);
  } catch (error) {
    console.error("Error generating follow-up suggestions:", error);
    res.status(500).json({ error: "Failed to generate follow-up suggestions" });
  }
});

export default router;
