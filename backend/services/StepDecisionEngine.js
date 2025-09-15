// StepDecisionEngine: classifies a step and routes validation according to a decision tree.
// - Structural (file/folder create/delete): static existence checks
// - Terminal (navigate/install): terminal log heuristics/static checks
// - Content changes: AI content checks, with fast-path success for removals

export async function aiClassifyStep(geminiService, { instruction, projectFiles }) {
  if (!geminiService || !geminiService.model) {
    throw new Error('Gemini service unavailable');
  }

  const ensureStr = (v) => (typeof v === 'string' ? v : '');
  const summarizeFiles = (files) => {
    try {
      if (!Array.isArray(files) || files.length === 0) return '';
      const names = files.slice(0, 20).map(n => n.name || n.path || '').filter(Boolean);
      return names.join(', ').slice(0, 400);
    } catch { return ''; }
  };

  const prompt = `Classify the user's step. Respond ONLY JSON (no prose).
Instruction: ${ensureStr(instruction)}
Files: ${summarizeFiles(projectFiles)}

Return exactly:
{
  "kind": "file_create|file_delete|folder_create|file_modify|clean_file|terminal-install|terminal-navigate|terminal-generic|generic",
  "target": "string or null"
}`;

  const result = await geminiService.model.generateContent(prompt);
  const responseText = (await result.response).text();
  const clean = extractJsonFromResponseSafe(responseText);
  const parsed = robustJsonParseSafe(clean);
  if (!parsed || typeof parsed !== 'object' || !parsed.kind) {
    throw new Error('AI classification returned invalid shape');
  }
  return { kind: String(parsed.kind), target: parsed.target || null };
}

// Core decision tree runner. Returns { handled, result, classification }.
export async function runDecisionTree({
  geminiService,
  instruction,
  projectFiles,
  code,
  language,
  terminalOutput,
  userId,
  helpers
}) {
  const {
    checkFileExists,
    extractFileTargetsFromInstruction,
    wasNavigationPerformedFromLogs,
    checkDirectoryExists,
    wasDependencyInstalledFromLogs,
    checkViteProjectCreated,
  } = helpers || {};

  // Guard: require essential helpers
  if (typeof checkFileExists !== 'function' || typeof extractFileTargetsFromInstruction !== 'function') {
    return { handled: false, classification: null };
  }

  // Pre-rule: Vite project creation command
  try {
    const lowered = String(instruction || '').toLowerCase();
    if (lowered.includes('npm create vite') || lowered.includes('npx create vite')) {
      const m = instruction.match(/create\s+vite@latest\s+([\w\-_.]+)/i);
      const projectName = m ? m[1] : null;
      if (projectName) {
        const created = typeof checkViteProjectCreated === 'function'
          ? checkViteProjectCreated(projectFiles, projectName)
          : checkFileExists(projectFiles, projectName, 'folder', userId);
        if (created) {
          const msg = `Excellent! You've created the React app '${projectName}' with Vite.`;
          return { handled: true, classification: { kind: 'terminal-generic', target: projectName }, result: { feedback: [{ line: 1, correct: true, suggestion: msg }], chatMessage: { type: 'assistant', content: msg }, analysisType: 'vite-create', targetName: projectName, exists: true } };
        }
        return { handled: true, classification: { kind: 'terminal-generic', target: projectName }, result: { feedback: [{ line: 1, correct: false, suggestion: `Please run the Vite create command or ensure '${projectName}' exists.` }], chatMessage: { type: 'assistant', content: `I don't see the project folder '${projectName}' yet.` }, analysisType: 'vite-create', targetName: projectName, exists: false } };
      }
    }
  } catch {}

  let classification;
  try {
    classification = await aiClassifyStep(geminiService, { instruction, projectFiles });
  } catch (_) {
    // Let caller fall back
    return { handled: false, classification: null };
  }

  const kind = String(classification.kind || '').toLowerCase();
  const aiTarget = classification.target;
  const termOut = Array.isArray(terminalOutput) ? terminalOutput : [];

  // Structural (create/delete)
  if (kind === 'file_create' || kind === 'folder_create' || kind === 'file_delete') {
    const what = kind === 'folder_create' ? 'folder' : 'file';
    const targets = aiTarget ? [aiTarget] : extractFileTargetsFromInstruction(instruction);
    const targetName = targets[0] || null;
    if (!targetName) {
      return {
        handled: true,
        classification,
        result: {
          feedback: [{ line: 1, correct: false, suggestion: 'Please specify the exact name to create or delete.' }],
          chatMessage: { type: 'assistant', content: 'I could not infer the target name. Please name the file or folder explicitly.' },
          analysisType: kind,
          targetName: null,
          exists: false
        }
      };
    }
    const exists = checkFileExists(projectFiles, targetName, what, userId);
    if (kind === 'file_delete') {
      if (!exists) {
        const msg = `Nice! '${targetName}' has been deleted.`;
        return { handled: true, classification, result: { feedback: [{ line: 1, correct: true, suggestion: msg }], chatMessage: { type: 'assistant', content: msg }, analysisType: kind, targetName, exists: false } };
      }
      return { handled: true, classification, result: { feedback: [{ line: 1, correct: false, suggestion: `Please delete '${targetName}'.` }], chatMessage: { type: 'assistant', content: `I still see '${targetName}'. Delete it to complete this step.` }, analysisType: kind, targetName, exists: true } };
    }
    // file_create or folder_create
    if (exists) {
      const msg = `Great! You've created the ${what} '${targetName}'.`;
      return { handled: true, classification, result: { feedback: [{ line: 1, correct: true, suggestion: msg }], chatMessage: { type: 'assistant', content: msg }, analysisType: kind, targetName, exists: true } };
    }
    return { handled: true, classification, result: { feedback: [{ line: 1, correct: false, suggestion: `Please create the ${what} '${targetName}'.` }], chatMessage: { type: 'assistant', content: `I don't see the ${what} '${targetName}' yet. Please create it.` }, analysisType: kind, targetName, exists: false } };
  }

  // Terminal steps
  if (kind === 'terminal-navigate') {
    const name = aiTarget || (extractFileTargetsFromInstruction(instruction)[0] || '').split('/')[0];
    const navigated = typeof wasNavigationPerformedFromLogs === 'function' && wasNavigationPerformedFromLogs(name, termOut);
    if (navigated || (typeof checkDirectoryExists === 'function' && checkDirectoryExists(projectFiles, name))) {
      const msg = `Navigation confirmed to '${name}'.`;
      return { handled: true, classification, result: { feedback: [{ line: 1, correct: true, suggestion: msg }], chatMessage: { type: 'assistant', content: msg }, analysisType: 'terminal-navigate', targetName: name, exists: true } };
    }
    return { handled: true, classification, result: { feedback: [{ line: 1, correct: false, suggestion: `Run: cd ${name}` }], chatMessage: { type: 'assistant', content: `I couldn't confirm navigation to '${name}'. Try 'cd ${name}'.` }, analysisType: 'terminal-navigate', targetName: name, exists: false } };
  }

  if (kind === 'terminal-install') {
    const installed = typeof wasDependencyInstalledFromLogs === 'function' && wasDependencyInstalledFromLogs(instruction, termOut);
    if (installed) {
      return { handled: true, classification, result: { feedback: [{ line: 1, correct: true, suggestion: 'Dependency installation detected. Proceed to the next step.' }], chatMessage: { type: 'assistant', content: 'Packages installed successfully.' }, analysisType: 'terminal-install', targetName: 'install', exists: true } };
    }
    return { handled: true, classification, result: { feedback: [{ line: 1, correct: false, suggestion: 'Please run the install command as instructed.' }], chatMessage: { type: 'assistant', content: 'I did not detect an install in the terminal output.' }, analysisType: 'terminal-install', targetName: 'install', exists: false } };
  }

  if (kind === 'terminal-generic') {
    return { handled: true, classification, result: { feedback: [{ line: 1, correct: false, suggestion: 'Please execute the terminal command and try again.' }], chatMessage: { type: 'assistant', content: 'Once the terminal command finishes, check again.' }, analysisType: 'terminal', targetName: 'terminal-command', exists: false } };
  }

  // Content change: provide fast-path for removal/clear
  const isRemoval = /\b(remove|delete|clear|strip|cleanup|reset|erase)\b/i.test(instruction);
  if (isRemoval) {
    const compact = String(code || '').replace(/\s+/g, '');
    const isTiny = compact.length === 0 || compact.length <= 4;
    if (isTiny) {
      return { handled: true, classification, result: { feedback: [{ line: 1, correct: true, suggestion: 'Looks good — the file has been cleared as requested.' }], chatMessage: { type: 'assistant', content: 'The file content is cleared as instructed.' }, analysisType: 'clean_file', targetName: classification?.target || null, exists: true } };
    }
  }

  // Not handled here — let caller perform AI content analysis
  return { handled: false, classification };
}

// Minimal JSON extract that tolerates models returning extra text
function extractJsonFromResponseSafe(text) {
  try {
    const m = String(text || '').match(/\{[\s\S]*\}$/);
    return m ? m[0] : String(text || '');
  } catch {
    return String(text || '');
  }
}

function robustJsonParseSafe(jsonString) {
  try { return JSON.parse(jsonString); } catch (e) {
    let lastCurly = jsonString.lastIndexOf('}');
    let lastSquare = jsonString.lastIndexOf(']');
    let last = Math.max(lastCurly, lastSquare);
    if (last !== -1) {
      try { return JSON.parse(jsonString.slice(0, last + 1)); } catch {}
    }
    return null;
  }
}
