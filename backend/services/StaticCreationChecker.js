import { fileSystemIndexer } from './FileSystemIndexer.js';
import { instructionParser } from './InstructionParser.js';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';

/**
 * Static Creation Checker
 * 
 * Combines the FileSystemIndexer and InstructionParser to provide
 * instant file/folder existence checking without AI calls.
 * 
 * This replaces the AI-powered aiExtractCreationIntent function
 * for most common creation scenarios.
 */
export class StaticCreationChecker {
  constructor() {
    this.confidenceThreshold = 70; // Minimum confidence to trust static analysis
  }

  /**
   * Analyze creation intent and check existence - main function
   * Returns AI-compatible result format
   */
  async analyzeCreationIntent(instruction, userId, projectFiles = []) {
    console.log(`[STATIC_CHECKER] Analyzing creation intent for user ${userId}: "${instruction}"`);
    
    try {
      // Step 1: Parse instruction for creation intent
      const parseResult = instructionParser.parseInstruction(instruction);
      
      // Step 2: If we have high confidence in the result, proceed with static analysis
      if (parseResult.confidence >= this.confidenceThreshold) {
        return this.processHighConfidenceResult(parseResult, userId, projectFiles);
      }
      
      // Step 3: For low confidence results, return indication that AI is needed
      return this.processLowConfidenceResult(parseResult);
      
    } catch (error) {
      console.error(`[STATIC_CHECKER] Error in static analysis:`, error);
      return {
        requiresAI: true,
        reason: 'static_analysis_error',
        error: error.message
      };
    }
  }

  /**
   * Process high-confidence parsing results
   */
  async processHighConfidenceResult(parseResult, userId, projectFiles) {
    const workspacePath = UserWorkspaceManager.getUserWorkspacePath(userId);
    
    // Convert to AI-compatible format
    const aiFormat = instructionParser.toAIFormat(parseResult);
    
    // If not a creation intent, return immediately
    if (!aiFormat.isCreation) {
      console.log(`[STATIC_CHECKER] Not a creation intent (confidence: ${parseResult.confidence}%)`);
      return aiFormat;
    }
    
    // If invalid creation, return error
    if (!aiFormat.isValid) {
      console.log(`[STATIC_CHECKER] Invalid creation intent (confidence: ${parseResult.confidence}%)`);
      return aiFormat;
    }
    
    // Check existence using our static indexer
    const existenceCheck = fileSystemIndexer.checkExistence(
      userId, 
      workspacePath, 
      aiFormat.targetName, 
      aiFormat.creationType
    );
    
    console.log(`[STATIC_CHECKER] Existence check for "${aiFormat.targetName}":`, existenceCheck);
    
    // Add existence information to result
    const finalResult = {
      ...aiFormat,
      exists: existenceCheck.exists,
      actualName: existenceCheck.actualName,
      actualPath: existenceCheck.relativePath,
      source: 'static_analysis'
    };
    
    console.log(`[STATIC_CHECKER] Final result (confidence: ${parseResult.confidence}%):`, finalResult);
    return finalResult;
  }

  /**
   * Process low-confidence parsing results
   */
  processLowConfidenceResult(parseResult) {
    console.log(`[STATIC_CHECKER] Low confidence result (${parseResult.confidence}%), requires AI analysis`);
    
    return {
      requiresAI: true,
      reason: 'low_confidence',
      confidence: parseResult.confidence,
      partialResult: instructionParser.toAIFormat(parseResult),
      extractedNames: parseResult.extractedNames,
      reasoning: parseResult.reasoning
    };
  }

  /**
   * Quick existence check for known file/folder names
   */
  quickExistenceCheck(userId, targetName, expectedType = null) {
    try {
      const workspacePath = UserWorkspaceManager.getUserWorkspacePath(userId);
      return fileSystemIndexer.checkExistence(userId, workspacePath, targetName, expectedType);
    } catch (error) {
      console.error(`[STATIC_CHECKER] Error in quick existence check:`, error);
      return { exists: false, type: null, error: error.message };
    }
  }

  /**
   * Enhanced version of the existing checkFileExists function
   * This can replace the current implementation for better performance
   */
  enhancedFileExistsCheck(userId, targetName, type = 'file') {
    try {
      const workspacePath = UserWorkspaceManager.getUserWorkspacePath(userId);
      const result = fileSystemIndexer.checkExistence(userId, workspacePath, targetName, type);
      return result.exists && result.type === type;
    } catch (error) {
      console.error(`[STATIC_CHECKER] Error in enhanced file exists check:`, error);
      return false;
    }
  }

  /**
   * Get diagnostic information about the file system state
   */
  getDiagnostics(userId) {
    try {
      const workspacePath = UserWorkspaceManager.getUserWorkspacePath(userId);
      return fileSystemIndexer.getAllItems(userId, workspacePath);
    } catch (error) {
      console.error(`[STATIC_CHECKER] Error getting diagnostics:`, error);
      return { error: error.message };
    }
  }

  /**
   * Test the static analyzer against a list of instructions
   */
  async testInstructions(instructions, userId = 'test-user') {
    const results = [];
    
    for (const instruction of instructions) {
      const result = await this.analyzeCreationIntent(instruction, userId);
      results.push({
        instruction,
        result,
        requiresAI: result.requiresAI || false
      });
    }
    
    const staticCount = results.filter(r => !r.requiresAI).length;
    const aiCount = results.filter(r => r.requiresAI).length;
    
    console.log(`[STATIC_CHECKER] Test results: ${staticCount} static, ${aiCount} AI-required out of ${results.length} total`);
    
    return {
      results,
      summary: {
        total: results.length,
        staticAnalysis: staticCount,
        aiRequired: aiCount,
        staticPercentage: (staticCount / results.length * 100).toFixed(1)
      }
    };
  }

  /**
   * Set confidence threshold for static analysis
   */
  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = Math.max(0, Math.min(100, threshold));
    console.log(`[STATIC_CHECKER] Confidence threshold set to ${this.confidenceThreshold}%`);
  }
}

// Singleton instance
export const staticCreationChecker = new StaticCreationChecker();
