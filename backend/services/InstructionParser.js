/**
 * Static Instruction Parser
 * 
 * Parses guided step instructions to extract file/folder creation operations
 * without using AI. Uses regex patterns and heuristics to identify:
 * - Creation intent (create, make, new, add)
 * - Modification intent (update, edit, modify, change)
 * - Target names and types (file vs folder)
 * 
 * This replaces AI calls for simple creation detection.
 */
export class InstructionParser {
  constructor() {
    // Creation verbs (strong indicators)
    this.creationVerbs = [
      'create', 'make', 'new', 'add', 'generate', 'build', 'setup', 'initialize'
    ];
    
    // Modification verbs (should NOT be treated as creation)
    this.modificationVerbs = [
      'update', 'edit', 'modify', 'change', 'alter', 'fix', 'correct', 'improve',
      'refactor', 'replace', 'insert', 'append', 'prepend', 'include'
    ];
    
    // File extensions (comprehensive list)
    this.fileExtensions = [
      // Web
      'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
      // Programming
      'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt',
      // Data/Config
      'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'config',
      // Documentation
      'md', 'txt', 'rst', 'doc', 'docx', 'pdf',
      // Other
      'sql', 'sh', 'bat', 'ps1', 'dockerfile', 'makefile', 'gitignore'
    ];
    
    // Common folder names
    this.commonFolders = [
      'src', 'components', 'styles', 'utils', 'assets', 'public', 'backend', 'frontend',
      'pages', 'hooks', 'services', 'api', 'routes', 'controllers', 'models', 'views',
      'tests', 'test', 'spec', 'docs', 'documentation', 'images', 'img', 'css', 'js',
      'lib', 'libs', 'node_modules', 'vendor', 'build', 'dist', 'output'
    ];
    
    // Patterns for extracting quoted names
    this.namePatterns = [
      // Single quotes: 'filename.ext' or 'foldername'
      /'([^']+)'/g,
      // Double quotes: "filename.ext" or "foldername"
      /"([^"]+)"/g,
      // Backticks: `filename.ext` or `foldername`
      /`([^`]+)`/g,
      // Unquoted but specific patterns: filename.ext
      /\b([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)\b/g,
      // Folder patterns: folder-name, folder_name
      /\b([a-zA-Z0-9_-]{2,})\b/g
    ];
    
    // Modification context patterns
    this.modificationContextPatterns = [
      /\b(to|in|into|inside|within|with)\s+/i,
      /\b(to\s+the|in\s+the|into\s+the)\s+/i,
      /\b(content|code|text|html|css|javascript)\s+(to|in|into)\s+/i
    ];
  }

  /**
   * Main parsing function - analyzes instruction for creation intent
   */
  parseInstruction(instruction) {
    console.log(`[INSTRUCTION_PARSER] Analyzing: "${instruction}"`);
    
    const lowered = instruction.toLowerCase();
    const result = {
      isCreation: false,
      isModification: false,
      isValid: false,
      creationType: null, // 'file' or 'folder'
      targetName: null,
      confidence: 0, // 0-100
      extractedNames: [],
      reasoning: []
    };

    // Step 1: Check for modification intent (takes priority)
    const modificationCheck = this.checkModificationIntent(lowered);
    if (modificationCheck.isModification) {
      result.isModification = true;
      result.reasoning.push('Detected modification intent');
      return result;
    }

    // Step 2: Check for creation intent
    const creationCheck = this.checkCreationIntent(lowered);
    if (!creationCheck.isCreation) {
      result.reasoning.push('No creation intent detected');
      return result;
    }

    result.isCreation = true;
    result.confidence = creationCheck.confidence;
    result.reasoning.push(...creationCheck.reasoning);

    // Step 3: Extract target names
    const extractedNames = this.extractTargetNames(instruction);
    result.extractedNames = extractedNames;
    
    if (extractedNames.length === 0) {
      result.reasoning.push('No target names found');
      return result;
    }

    // Step 4: Determine the most likely target
    const targetAnalysis = this.analyzeTargetName(extractedNames, lowered);
    if (targetAnalysis.targetName) {
      result.targetName = targetAnalysis.targetName;
      result.creationType = targetAnalysis.type;
      result.isValid = true;
      result.confidence = Math.min(result.confidence + targetAnalysis.confidence, 100);
      result.reasoning.push(...targetAnalysis.reasoning);
    }

    console.log(`[INSTRUCTION_PARSER] Result:`, result);
    return result;
  }

  /**
   * Check if instruction indicates modification (not creation)
   */
  checkModificationIntent(lowered) {
    const result = {
      isModification: false,
      confidence: 0,
      reasoning: []
    };

    // Check for modification verbs
    for (const verb of this.modificationVerbs) {
      if (lowered.includes(verb)) {
        result.isModification = true;
        result.confidence += 30;
        result.reasoning.push(`Found modification verb: ${verb}`);
      }
    }

    // Check for modification context patterns
    for (const pattern of this.modificationContextPatterns) {
      if (pattern.test(lowered)) {
        result.isModification = true;
        result.confidence += 40;
        result.reasoning.push(`Found modification context pattern`);
      }
    }

    // Special case: "add" with context is modification
    if (lowered.includes('add') && (lowered.includes(' to ') || lowered.includes(' in ') || lowered.includes(' into '))) {
      result.isModification = true;
      result.confidence += 50;
      result.reasoning.push('Add with context indicates modification');
    }

    return result;
  }

  /**
   * Check if instruction indicates creation
   */
  checkCreationIntent(lowered) {
    const result = {
      isCreation: false,
      confidence: 0,
      reasoning: []
    };

    // Check for creation verbs
    for (const verb of this.creationVerbs) {
      if (lowered.includes(verb)) {
        result.isCreation = true;
        result.confidence += verb === 'create' ? 50 : 30;
        result.reasoning.push(`Found creation verb: ${verb}`);
      }
    }

    // Check for creation patterns
    if (lowered.includes('called')) {
      result.confidence += 20;
      result.reasoning.push('Found "called" pattern');
    }
    
    if (lowered.includes('named')) {
      result.confidence += 20;
      result.reasoning.push('Found "named" pattern');
    }

    // Folder-specific patterns
    if (lowered.includes('folder') || lowered.includes('directory') || lowered.includes('dir')) {
      result.confidence += 30;
      result.reasoning.push('Found folder-specific terms');
    }

    // File-specific patterns
    if (lowered.includes('file')) {
      result.confidence += 30;
      result.reasoning.push('Found file-specific terms');
    }

    return result;
  }

  /**
   * Extract potential target names from instruction
   */
  extractTargetNames(instruction) {
    const names = new Set();
    
    // Try each pattern
    for (const pattern of this.namePatterns) {
      const matches = [...instruction.matchAll(pattern)];
      for (const match of matches) {
        if (match[1] && match[1].length > 0) {
          // Clean the name
          const cleaned = match[1].trim().replace(/^\.\//, '');
          if (cleaned.length > 0 && !this.isCommonWord(cleaned)) {
            names.add(cleaned);
          }
        }
      }
    }
    
    return Array.from(names);
  }

  /**
   * Analyze extracted names to determine the most likely target
   */
  analyzeTargetName(names, lowered) {
    const result = {
      targetName: null,
      type: null,
      confidence: 0,
      reasoning: []
    };

    for (const name of names) {
      const analysis = this.analyzeIndividualName(name, lowered);
      if (analysis.confidence > result.confidence) {
        result.targetName = name;
        result.type = analysis.type;
        result.confidence = analysis.confidence;
        result.reasoning = analysis.reasoning;
      }
    }

    return result;
  }

  /**
   * Analyze a single name to determine if it's a file or folder
   */
  analyzeIndividualName(name, lowered) {
    const result = {
      type: null,
      confidence: 0,
      reasoning: []
    };

    const nameLower = name.toLowerCase();
    
    // Check for file extension
    const hasExtension = this.hasFileExtension(name);
    if (hasExtension) {
      result.type = 'file';
      result.confidence = 80;
      result.reasoning.push(`Has file extension`);
      return result;
    }

    // Check if it's a common folder name
    if (this.commonFolders.includes(nameLower)) {
      result.type = 'folder';
      result.confidence = 70;
      result.reasoning.push(`Common folder name`);
      return result;
    }

    // Context clues from instruction
    if (lowered.includes('folder') || lowered.includes('directory')) {
      result.type = 'folder';
      result.confidence = 60;
      result.reasoning.push(`Instruction mentions folder/directory`);
    } else if (lowered.includes('file')) {
      result.type = 'file';
      result.confidence = 60;
      result.reasoning.push(`Instruction mentions file`);
    } else {
      // Default heuristics
      if (nameLower.includes('-') || nameLower.includes('_')) {
        // Kebab-case or snake_case often indicates folders
        result.type = 'folder';
        result.confidence = 40;
        result.reasoning.push(`Naming convention suggests folder`);
      } else {
        // Single word, could be either
        result.type = 'folder';
        result.confidence = 30;
        result.reasoning.push(`Default to folder for ambiguous case`);
      }
    }

    return result;
  }

  /**
   * Check if name has a valid file extension
   */
  hasFileExtension(name) {
    const parts = name.split('.');
    if (parts.length < 2) return false;
    
    const extension = parts[parts.length - 1].toLowerCase();
    return this.fileExtensions.includes(extension) || /^[a-z0-9]{1,5}$/.test(extension);
  }

  /**
   * Check if word is too common to be a target name
   */
  isCommonWord(word) {
    const commonWords = [
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those'
    ];
    return commonWords.includes(word.toLowerCase()) || word.length < 2;
  }

  /**
   * Convert parser result to AI-compatible format
   */
  toAIFormat(parseResult) {
    if (!parseResult.isCreation) {
      return {
        isCreation: false,
        isValid: true,
        creationType: null,
        targetName: null,
        error: null,
        suggestion: null,
        confidence: parseResult.confidence,
        source: 'static_parser'
      };
    }

    if (!parseResult.isValid) {
      return {
        isCreation: true,
        isValid: false,
        creationType: null,
        targetName: null,
        error: 'Could not determine target name clearly',
        suggestion: 'Please specify the exact name (e.g., Create a folder called "my-app" or Create a file called "index.html")',
        confidence: parseResult.confidence,
        source: 'static_parser'
      };
    }

    return {
      isCreation: true,
      isValid: true,
      creationType: parseResult.creationType,
      targetName: parseResult.targetName,
      error: null,
      suggestion: null,
      confidence: parseResult.confidence,
      source: 'static_parser'
    };
  }
}

// Singleton instance
export const instructionParser = new InstructionParser();
