'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, MessageSquare, Lightbulb, Code2, AlertCircle, CheckCircle, Loader2, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markup'; // For HTML
import 'prismjs/themes/prism-tomorrow.css'; // Or any other Prism theme you prefer
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
import GuidedStep from '@/components/GuidedStep';


const supportedLanguages = [
  { id: 'javascript', name: 'JavaScript', extension: '.js' },
  { id: 'python', name: 'Python', extension: '.py' },
  { id: 'html', name: 'HTML', extension: '.html' }
];

const defaultCode = {
  javascript: `// Your first JavaScript function`,

  python: `# Your first Python function`,

  html: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>Welcome to coding!</p>
    <script>
        console.log("Page loaded successfully!");
    </script>
</body>
</html>`
};

type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

interface Step {
  id: string;
  instruction: string;
  lineRanges: number[];
}

interface GuidedProject {
  projectId: string;
  steps: Step[];
  currentStep: number;
}

export default function IDEPage() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(defaultCode.javascript);
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);
  const router = useRouter();
  const [output, setOutput] = useState('');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', content: 'Welcome! I\'m here to help you learn to code. Ask me for hints or help with errors!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [showTranslateBubble, setShowTranslateBubble] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [hintedLine, setHintedLine] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isGuidedModalOpen, setIsGuidedModalOpen] = useState(false);
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [stepFeedback, setStepFeedback] = useState<any[]>([]);

  useEffect(() => {
    const initPyodide = async () => {
      try {
        // Load Pyodide from CDN
        const pyodideScript = document.createElement('script');
        pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        document.body.appendChild(pyodideScript);

        await new Promise((resolve, reject) => {
          pyodideScript.onload = resolve;
          pyodideScript.onerror = reject;
        });

        // @ts-ignore
        const pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
        });
        
        setPyodide(pyodideInstance);
        setIsPyodideLoading(false);
      } catch (error) {
        console.error('Failed to load Pyodide:', error);
        setIsPyodideLoading(false);
      }
    };

    initPyodide();
  }, []);

  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId);
    setCode(defaultCode[langId as keyof typeof defaultCode]);
    setExecutionStatus('idle');
    setOutput('');
    setHintedLine(null);
    setHighlightedLine(null);
  };

  const executeJavaScript = (code: string) => {
    const logs: string[] = [];
    const errors: string[] = [];
    
    // Create a custom console for capturing output
    const customConsole = {
      log: (...args: any[]) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      },
      error: (...args: any[]) => {
        errors.push(args.map(arg => String(arg)).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('⚠️ ' + args.map(arg => String(arg)).join(' '));
      }
    };

    try {
      // Create a function that executes the code with our custom console
      const executeCode = new Function('console', code);
      executeCode(customConsole);
      
      if (errors.length > 0) {
        return `❌ Errors:\n${errors.join('\n')}\n\n📝 Output:\n${logs.join('\n')}`;
      }
      
      return logs.length > 0 ? logs.join('\n') : '✅ Code executed successfully (no output)';
    } catch (error) {
      return `❌ Runtime Error: ${error}`;
    }
  };

  const executePython = async (code: string) => {
    if (!pyodide) {
      return '❌ Python runtime is not ready yet. Please wait a moment and try again.';
    }

    let capturedOutput = '';
    const originalStdout = pyodide.runPython("import sys; sys.stdout");

    try {
      // Redirect Python's stdout to our JavaScript variable, handling byte arrays
      pyodide.setStdout({ write: (msg: any) => {
        let textMsg = '';
        if (typeof msg === 'string') {
          textMsg = msg;
        } else if (msg instanceof Uint8Array) {
          // Use TextDecoder to convert Uint8Array to string
          textMsg = new TextDecoder().decode(msg);
        } else {
          // Fallback for other unexpected types (should ideally not happen with direct Pyodide output)
          textMsg = String(msg);
        }
        capturedOutput += textMsg;
        return msg.length || 0; // Return the original length of the message/buffer
      } });

      // Execute the code
      await pyodide.runPythonAsync(code);

      console.log('Final capturedOutput before return:', capturedOutput);

      // Return the captured output, preserving newlines
      return capturedOutput;
    } catch (error: any) {
      return `❌ Python Error: ${error.message}`;
    } finally {
      // Restore original stdout to avoid side effects
      pyodide.setStdout(originalStdout);
    }
  };

  const executeHTML = (code: string) => {
    // For HTML, we'll show a preview message and extract any console.log statements
    const logs: string[] = [];
    
    // Extract JavaScript from script tags
    const scriptMatches = code.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        const jsCode = script.replace(/<script[^>]*>|<\/script>/gi, '');
        const consoleMatches = jsCode.match(/console\.log\([^)]+\)/g);
        if (consoleMatches) {
          consoleMatches.forEach(logStatement => {
            const content = logStatement.match(/console\.log\(["']([^"']+)["']\)/);
            if (content) {
              logs.push(content[1]);
            }
          });
        }
      });
    }
    
    let output = '🌐 HTML page would be rendered in browser\n';
    if (logs.length > 0) {
      output += '📝 Console output:\n' + logs.join('\n');
    }
    
    return output;
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setExecutionStatus('idle');
    setOutput('');
    setHintedLine(null);
  };

  // Simplified highlightCode function without line numbers
  const highlightCode = (code: string, language: string) => {
    let langObj: any;
    if (languages[language as keyof typeof languages]) {
      langObj = languages[language as keyof typeof languages];
    } else {
      langObj = languages.clike; // Fallback to clike if language not found
    }

    return highlight(code, langObj, language);
  };

  const handleRunCode = async () => {
    setExecutionStatus('running');
    setIsRunning(true);
    setOutput('🚀 Running code...\n');
    
    let result = '';

    try {
      switch (selectedLanguage) {
        case 'javascript':
          result = executeJavaScript(code);
          break;
        case 'python':
          result = await executePython(code);
          break;
        case 'html':
          result = executeHTML(code);
          break;
        default:
          result = `${selectedLanguage} execution not implemented yet`;
      }
      
      setOutput(result);
      setExecutionStatus(result.startsWith('❌') ? 'error' : 'success');
    } catch (error: any) {
      setOutput(`❌ Error: ${error.message}`);
      setExecutionStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleTranslateError = async () => {
    // Ensure we have an error message to translate
    if (!output || !output.startsWith('❌')) {
      return;
    }

    try {
      const errorMessage = output.substring(output.indexOf('❌') + 2).trim();
      // Directly call the backend API route for translation
      const response = await fetch('http://localhost:8000/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: errorMessage }),
      });

      const result = await response.json();

      if (result.success && result.translation) {
        const translatedMessage = `
Translated Error (Severity: ${result.translation.severity || 'Unknown'}):
${result.translation.text}

Error Type: ${result.translation.error_type || 'N/A'}

Suggestions:
${result.translation.suggestions && result.translation.suggestions.length > 0 
  ? result.translation.suggestions.map((s: string) => `- ${s}`).join('\n')
  : '- No specific suggestions provided.'}

Common Causes:
${result.translation.common_causes && result.translation.common_causes.length > 0 
  ? result.translation.common_causes.map((c: string) => `- ${c}`).join('\n')
  : '- No common causes listed.'}
`;

        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: translatedMessage }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: `Failed to translate error: ${result.error || 'Unknown error'}` }
        ]);
      }
    } catch (error: any) {
      console.error('Error translating error message:', error);
      setChatMessages(prev => [
        ...prev,
        { type: 'system', content: `Failed to translate error due to a network or server issue: ${error.message}` }
      ]);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');

    try {
      const response = await fetch('/api/guided/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject?.projectId,
          currentStep: guidedProject?.currentStep,
          history: [...chatMessages, newMessage]
        })
      });

      if (!response.ok) throw new Error('Failed to get chat response');

      const data = await response.json();
      setChatMessages(prev => [...prev, data.response]);
    } catch (error) {
      console.error('Error in chat:', error);
      // Handle error
    }
  };

  const handleHint = async () => {
    setChatMessages(prev => [...prev, { type: 'system', content: 'Generating hint...' }]);

    try {
      const response = await fetch('http://localhost:8000/api/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: selectedLanguage,
        }),
      });

      const result = await response.json();

      if (result.success && result.hint) {
        let hintMessageContent = `💡 AI Hint: ${result.hint.hint_text}`;
        if (result.hint.line_number) {
          hintMessageContent += ` (Line: ${result.hint.line_number})`;
          setHintedLine(result.hint.line_number);
        }
        if (result.hint.detailed_explanation) {
          hintMessageContent += `\n\n${result.hint.detailed_explanation}`;
        }
        
        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: hintMessageContent }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: `Failed to get hint: ${result.error || 'Unknown error'}` }
        ]);
      }
    } catch (error: any) {
      console.error('Error generating hint:', error);
      setChatMessages(prev => [
        ...prev,
        { type: 'system', content: `Failed to get hint due to a network or server issue: ${error.message}` }
      ]);
    }
  };

  const handleSuggestFix = async () => {
    // Set fixing state to true at the beginning
    setIsFixing(true);

    try {
      // Run analysis first to get errors
      const analysisMessage = {
        type: 'assistant',
        content: '🔍 Let me analyze your code first to find issues that need fixing...'
      };
      setChatMessages(prev => [...prev, analysisMessage]);

      const response = await fetch('http://localhost:8000/api/code/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: selectedLanguage,
          context: 'IDE analysis for fix suggestion'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const currentAnalysisResults = await response.json();
      setAnalysisResults(currentAnalysisResults);

      if (currentAnalysisResults.errors.length === 0) {
        const noErrorsMessage = {
          type: 'assistant',
          content: '✅ Great news! No errors found in your code. Your code looks good to go!'
        };
        setChatMessages(prev => [...prev, noErrorsMessage]);
        return; // No errors, so nothing to fix.
      }

      // Now proceed with fix suggestion.
      const firstError = currentAnalysisResults.errors[0];
      const fixResponse = await fetch('http://localhost:8000/api/code/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: selectedLanguage,
          error_message: firstError.message,
          line_number: firstError.line_number
        }),
      });

      if (!fixResponse.ok) {
        throw new Error(`HTTP error! status: ${fixResponse.status}`);
      }

      const fixResult = await fixResponse.json();

      if (fixResult.success && fixResult.fixed) {
        setCode(fixResult.code);
        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: '✅ Code fixed successfully! The suggested changes have been applied.' }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: `❌ Failed to fix code: ${fixResult.error || 'Unknown error'}` }
        ]);
      }
    } catch (error: any) {
      console.error('Error in handleSuggestFix:', error);
      setChatMessages(prev => [
        ...prev,
        { type: 'system', content: `❌ Error during fix suggestion: ${error.message}. Make sure the backend server is running on port 8000.` }
      ]);
    } finally {
      setIsFixing(false); // Ensure fixing state is reset whether successful or not
    }
  };

  // Custom editor wrapper component with line numbers - FIXED VERSION
  const CodeEditorWithLineNumbers = () => {
    const lineCount = code.split('\n').length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    
    // useEffect to manage cursor position after code changes
    useEffect(() => {
      const textarea = editorContainerRef.current?.querySelector('textarea');
      if (textarea) {
        // Set cursor to the end of the text
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    }, [code]); // Re-run this effect whenever 'code' changes

    return (
      <div 
        ref={editorContainerRef}
        className="flex h-full relative"
      >
        {/* Line numbers column */}
        <div 
          className="flex-shrink-0 bg-gray-700 text-gray-400 text-right pr-3 pl-2 py-2 select-none" 
          style={{ fontFamily: '"Fira code", "Fira Mono", monospace', fontSize: 14, lineHeight: '1.5' }}
        >
          {lineNumbers.map(num => (
            <div 
              key={num} 
              className={`${num === highlightedLine ? 'text-blue-400 bg-blue-900/30' : ''} ${num === hintedLine ? 'text-yellow-400 bg-yellow-900/30' : ''}`}
              style={{ minWidth: '30px', height: '21px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
            >
              {num}
            </div>
          ))}
        </div>
        
        {/* Code editor */}
        <div className="flex-1 relative">
          <Editor
            value={code}
            onValueChange={handleCodeChange}
            highlight={code => highlightCode(code, selectedLanguage)}
            padding={10}
            className="h-full font-mono text-sm overflow-auto"
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 14,
              lineHeight: '1.5',
            }}
            textareaId="codeEditor"
            autoFocus={true} // Keep autoFocus for initial focus
            onSelect={(e) => {
              // Only update highlighted line, do not interfere with default selection behavior
              const textarea = e.target as HTMLTextAreaElement;
              const lineNumber = (textarea.value.substring(0, textarea.selectionStart).match(/\n/g) || []).length + 1;
              setHighlightedLine(lineNumber);
            }}
          />
        </div>
      </div>
    );
  };

  const handleStartGuidedProject = async (description: string) => {
    try {
      const response = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDescription: description })
      });

      if (!response.ok) throw new Error('Failed to start project');

      const data = await response.json();
      setGuidedProject({
        projectId: data.projectId,
        steps: data.steps,
        currentStep: 0
      });
      setIsGuidedModalOpen(false);
      
      // Add welcome message to chat
      setChatMessages(prev => [...prev, data.welcomeMessage]);
    } catch (error) {
      console.error('Error starting guided project:', error);
      // Handle error (show toast notification, etc.)
    }
  };

  const handleAnalyzeStep = async () => {
    if (!guidedProject) return;

    try {
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject.projectId,
          stepId: guidedProject.steps[guidedProject.currentStep].id,
          code
        })
      });

      if (!response.ok) throw new Error('Failed to analyze step');

      const data = await response.json();
      setStepFeedback(data.feedback);
      
      // Add feedback message to chat
      setChatMessages(prev => [...prev, data.chatMessage]);
    } catch (error) {
      console.error('Error analyzing step:', error);
      // Handle error
    }
  };

  const handleNextStep = () => {
    if (!guidedProject) return;

    const nextStep = guidedProject.currentStep + 1;
    if (nextStep < guidedProject.steps.length) {
      setGuidedProject({
        ...guidedProject,
        currentStep: nextStep
      });
      setStepFeedback([]);
      
      // Add next step message to chat
      const nextStepMessage = {
        type: 'assistant',
        content: `Great! Let's move on to step ${nextStep + 1}:\n\n${guidedProject.steps[nextStep].instruction}\n\nI'll help you write the code in the specified line ranges.`
      };
      setChatMessages(prev => [...prev, nextStepMessage]);
    } else {
      // Project completed
      const completionMessage = {
        type: 'assistant',
        content: "🎉 Congratulations! You've completed the project! Feel free to start a new project or continue exploring the IDE."
      };
      setChatMessages(prev => [...prev, completionMessage]);
      setGuidedProject(null);
      setStepFeedback([]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-2 px-4 bg-gray-800 shadow-md">
        <h1 className="text-xl font-bold text-blue-400">Bolt IDE</h1>
        <div className="flex items-center space-x-4">
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-3 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {supportedLanguages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleRunCode}
            className="flex items-center px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isRunning || isPyodideLoading}
          >
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run
          </button>
          <button
            onClick={() => setIsGuidedModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
          >
            <BookOpen className="h-4 w-4" />
            <span>Start Guided Project</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col bg-gray-850 border-r border-gray-700 h-full">
          <div className="flex justify-between items-center py-1 px-2 bg-gray-700">
            <span className="text-sm font-semibold">{selectedLanguage.toUpperCase()} Code</span>
          </div>
          <div className="flex-1 overflow-auto">
            <CodeEditorWithLineNumbers />
          </div>
        </div>

        {/* Output and Chat Area */}
        <div className="w-[450px] flex flex-col">
          {/* Output Window */}
          <div className="h-[400px] flex flex-col bg-gray-800 p-4 overflow-auto text-sm border-b border-gray-700">
            <h2 className="text-lg font-semibold mb-2">Output</h2>
            <pre className="flex-1 bg-gray-900 p-3 rounded-md overflow-auto text-sm text-gray-200">
              {isPyodideLoading && selectedLanguage === 'python' ? 'Loading Python runtime (Pyodide)...' : output}
            </pre>
            {executionStatus === 'error' && output.startsWith('❌') && (
              <button
                onClick={handleTranslateError}
                className="mt-2 flex items-center justify-center px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Translate Error
              </button>
            )}
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-gray-800 p-4 min-h-0">
            <h2 className="text-lg font-semibold mb-2">AI Assistant</h2>
            <div className="flex flex-col overflow-y-auto space-y-2 bg-gray-900 p-3 rounded-md mb-3 min-h-[100px]">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] p-2 rounded-lg text-sm whitespace-pre-wrap ${
                      msg.type === 'user'
                        ? 'bg-blue-700 text-white'
                        : 'bg-gray-700 text-gray-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Action Buttons */}
            <div className="flex space-x-2 mb-3">
              <button
                onClick={handleSuggestFix}
                className="flex items-center flex-1 px-4 py-2 bg-orange-600 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white text-sm justify-center"
                disabled={isFixing}
              >
                {isFixing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                Suggest Fix
              </button>
              <button
                onClick={handleHint}
                className="flex items-center flex-1 px-4 py-2 bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white text-sm justify-center"
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Get Hint
              </button>
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="flex">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask for help or a hint..."
                className="flex-1 px-3 py-2 rounded-l-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Add these components before the editor */}
      <ProjectDescriptionModal
        isOpen={isGuidedModalOpen}
        onClose={() => setIsGuidedModalOpen(false)}
        onSubmit={handleStartGuidedProject}
      />

      {guidedProject && (
        <GuidedStep
          instruction={guidedProject.steps[guidedProject.currentStep].instruction}
          feedback={stepFeedback}
          onNextStep={handleNextStep}
          isLastStep={guidedProject.currentStep === guidedProject.steps.length - 1}
        />
      )}
    </div>
  );
}