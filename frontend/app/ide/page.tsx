'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, MessageSquare, Lightbulb, Code2, AlertCircle, CheckCircle, Loader2, BookOpen, X, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MonacoEditor from '@/components/MonacoEditor';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
import GuidedStepPopup from '@/components/GuidedStepPopup';
import TypingIndicator from '@/components/TypingIndicator';
import FileExplorer from '@/components/FileExplorer';
import RunDropdown from '@/components/RunDropdown';
import HTMLPreview from '@/components/HTMLPreview';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
}

const supportedLanguages = [
  { id: 'javascript', name: 'JavaScript', extension: '.js' },
  { id: 'python', name: 'Python', extension: '.py' },
  { id: 'html', name: 'HTML', extension: '.html' },
  { id: 'css', name: 'CSS', extension: '.css' }
];

const defaultFiles: FileNode[] = [
  {
    id: '1',
    name: 'index.html',
    type: 'file',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to My Project</h1>
        <p>This is a sample HTML file. Edit me to get started!</p>
        <button onclick="greet()">Click Me</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
    language: 'html'
  },
  {
    id: '2',
    name: 'style.css',
    type: 'file',
    content: `body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f0f0f0;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    text-align: center;
}

button {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

button:hover {
    background-color: #0056b3;
}`,
    language: 'css'
  },
  {
    id: '3',
    name: 'script.js',
    type: 'file',
    content: `function greet() {
    alert('Hello from JavaScript!');
}

// Add more JavaScript functionality here
console.log('Script loaded successfully!');`,
    language: 'javascript'
  },
  {
    id: '4',
    name: 'main.py',
    type: 'file',
    content: `# Python script example
def greet(name):
    return f"Hello, {name}!"

def main():
    name = input("Enter your name: ")
    message = greet(name)
    print(message)

if __name__ == "__main__":
    main()`,
    language: 'python'
  }
];

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

interface ChatMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
}

export default function IDEPage() {
  const [files, setFiles] = useState<FileNode[]>(defaultFiles);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(defaultFiles[0]);
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);
  const router = useRouter();
  const [output, setOutput] = useState('');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('idle');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
  const [isStepComplete, setIsStepComplete] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [showRunTooltip, setShowRunTooltip] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Interactive input state
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [pendingInputs, setPendingInputs] = useState<string[]>([]);
  const [currentPythonCode, setCurrentPythonCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Debug step completion
  useEffect(() => {
    if (guidedProject) {
      console.log(`Step ${guidedProject.currentStep + 1} completion status:`, isStepComplete);
    }
  }, [isStepComplete, guidedProject]);

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

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
        return 'javascript';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return 'javascript';
    }
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setShowPreview(false);
  };

  const handleFileCreate = (parentId: string | null, type: 'file' | 'folder', name: string) => {
    const newFile: FileNode = {
      id: Date.now().toString(),
      name,
      type,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      language: type === 'file' ? getLanguageFromFileName(name) : undefined
    };

    if (parentId) {
      // Add to specific folder
      const updateFiles = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === parentId && node.type === 'folder') {
            return {
              ...node,
              children: [...(node.children || []), newFile]
            };
          } else if (node.children) {
            return {
              ...node,
              children: updateFiles(node.children)
            };
          }
          return node;
        });
      };
      setFiles(updateFiles(files));
    } else {
      // Add to root
      setFiles([...files, newFile]);
    }

    if (type === 'file') {
      setSelectedFile(newFile);
    }
  };

  const handleFileDelete = (fileId: string) => {
    const deleteFromFiles = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === fileId) {
          return false;
        }
        if (node.children) {
          node.children = deleteFromFiles(node.children);
        }
        return true;
      });
    };

    setFiles(deleteFromFiles(files));
    if (selectedFile?.id === fileId) {
      setSelectedFile(files[0] || null);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile) {
      const newCode = value || '';
      const updatedFile = { ...selectedFile, content: newCode };
      setSelectedFile(updatedFile);
      
      // Update in files array
      const updateFiles = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === selectedFile.id) {
            return updatedFile;
          } else if (node.children) {
            return {
              ...node,
              children: updateFiles(node.children)
            };
          }
          return node;
        });
      };
      setFiles(updateFiles(files));
    }
    setExecutionStatus('idle');
    setOutput('');
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

    // Check if code contains input() calls
    const inputMatches = code.match(/input\([^)]*\)/g);
    if (!inputMatches) {
      // No input() calls, execute normally
      let capturedOutput = '';
      const originalStdout = pyodide.runPython("import sys; sys.stdout");

      try {
        pyodide.setStdout({ write: (msg: any) => {
          let textMsg = '';
          if (typeof msg === 'string') {
            textMsg = msg;
          } else if (msg instanceof Uint8Array) {
            textMsg = new TextDecoder().decode(msg);
          } else {
            textMsg = String(msg);
          }
          capturedOutput += textMsg;
          return msg.length || 0;
        } });

        await pyodide.runPythonAsync(code);
        return capturedOutput;
      } catch (error: any) {
        return `❌ Python Error: ${error.message}`;
      } finally {
        pyodide.setStdout(originalStdout);
      }
    } else {
      // Has input() calls, handle interactively
      return await executePythonWithInput(code);
    }
  };

  const executePythonWithInput = async (code: string): Promise<string> => {
    if (!pyodide) {
      return '❌ Python runtime is not ready yet.';
    }

    try {
      // Store the original code and prepare for interactive execution
      setCurrentPythonCode(code);
      setPendingInputs([]);
      setIsWaitingForInput(true);
      
      // Extract all input() calls to prepare prompts
      const inputMatches = code.match(/input\([^)]*\)/g) || [];
      const prompts: string[] = [];
      
      for (const match of inputMatches) {
        // Extract the prompt from input("prompt") or input()
        const promptMatch = match.match(/input\(["']([^"']*)["']\)/);
        prompts.push(promptMatch ? promptMatch[1] : '');
      }
      
      setPendingInputs(prompts);
      
      // Show the first prompt
      if (prompts.length > 0) {
        setInputPrompt(prompts[0]);
        setInputValue('');
        setOutput(prev => prev + (prompts[0] || 'Enter input: '));
        
        // Focus the input field
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
      
      // Return a placeholder - actual execution will happen after inputs
      return '⏳ Waiting for input...\n';
    } catch (error: any) {
      return `❌ Error setting up interactive input: ${error.message}`;
    }
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && pendingInputs.length > 0) return;

    const currentInput = inputValue;
    setInputValue('');
    
    // Add the input to the output
    // setOutput(prev => prev + currentInput + '\n');
    
    // Store this input for Python execution
    const updatedInputs = [...pendingInputs];
    
    // Replace the current input() call with the user's input
    let modifiedCode = currentPythonCode;
    const inputMatches = currentPythonCode.match(/input\([^)]*\)/g) || [];
    
    if (inputMatches.length > 0) {
      try {
        // Replace the first input() call with the user's input
        const firstInputMatch = inputMatches[0];
        if (firstInputMatch) {
          const escapedInput = currentInput.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          modifiedCode = modifiedCode.replace(firstInputMatch, `"${escapedInput}"`);
        }
        
        // Remove the first prompt from pending inputs
        updatedInputs.shift();
        setPendingInputs(updatedInputs);
        
        if (updatedInputs.length > 0) {
          // More inputs needed
          setInputPrompt(updatedInputs[0]);
          setOutput(prev => prev + (updatedInputs[0] || 'Enter input: '));
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        } else {
          // All inputs provided, execute the modified code
          setIsWaitingForInput(false);
          setInputPrompt('');
          
          // Execute the modified code
          let capturedOutput = '';
          const originalStdout = pyodide.runPython("import sys; sys.stdout");

          try {
            pyodide.setStdout({ write: (msg: any) => {
              let textMsg = '';
              if (typeof msg === 'string') {
                textMsg = msg;
              } else if (msg instanceof Uint8Array) {
                textMsg = new TextDecoder().decode(msg);
              } else {
                textMsg = String(msg);
              }
              capturedOutput += textMsg;
              return msg.length || 0;
            } });

            await pyodide.runPythonAsync(modifiedCode);
            
            // Add the final output
            setOutput(prev => prev + capturedOutput);
            setExecutionStatus(capturedOutput.includes('❌') ? 'error' : 'success');
          } catch (error: any) {
            const errorOutput = `❌ Python Error: ${error.message}`;
            setOutput(prev => prev + errorOutput);
            setExecutionStatus('error');
          } finally {
            try {
              pyodide.setStdout(originalStdout);
            } catch (stdoutError) {
              console.warn('Error restoring stdout:', stdoutError);
            }
            setIsRunning(false);
          }
        }
      } catch (error: any) {
        const errorOutput = `❌ Error processing input: ${error.message}`;
        setOutput(prev => prev + errorOutput);
        setExecutionStatus('error');
        setIsWaitingForInput(false);
        setIsRunning(false);
      }
    }
  };

  const executeHTML = (file: FileNode) => {
    // Find related CSS and JS files
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => f.name.endsWith('.js'));
    
    setShowPreview(true);
    setOutput('🌐 HTML preview is now displayed in the preview panel');
    setExecutionStatus('success');
  };

  const handleRunFile = async (file: FileNode) => {
    setExecutionStatus('running');
    setIsRunning(true);
    setOutput('🚀 Running ' + file.name + '...\n');
    
    let result = '';

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'js':
          result = executeJavaScript(file.content || '');
          break;
        case 'py':
          result = await executePython(file.content || '');
          break;
        case 'html':
          executeHTML(file);
          return; // Early return for HTML
        default:
          result = `${extension} execution not implemented yet`;
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

  // Add keyboard event listener for Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isRunning && !isPyodideLoading && selectedFile) {
          handleRunFile(selectedFile);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRunning, isPyodideLoading, selectedFile]);

  // Cleanup input state on unmount
  useEffect(() => {
    return () => {
      setIsWaitingForInput(false);
      setInputPrompt('');
      setInputValue('');
      setPendingInputs([]);
      setCurrentPythonCode('');
    };
  }, []);

  const handleTranslateError = async () => {
    if (!output.startsWith('❌')) return;

    setIsAssistantTyping(true);
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
        const translatedMessage: ChatMessage = {
          type: 'system',
          content: `
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
`
        };
        setChatMessages(prev => [...prev, translatedMessage]);
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
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAssistantTyping(true);

    if (guidedProject) {
      try {
        const response = await fetch('http://localhost:8000/api/guided/project-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: guidedProject.projectId,
            currentStep: guidedProject.currentStep,
            history: [...chatMessages, userMessage],
          }),
        });
        const data = await response.json();
        if (data.response && data.response.content) {
          setChatMessages(prev => [...prev, { type: 'assistant', content: data.response.content }]);
        } else {
          setChatMessages(prev => [...prev, { type: 'system', content: 'Failed to get a response from the assistant.' }]);
        }
      } catch (error: any) {
        setChatMessages(prev => [...prev, { type: 'system', content: 'Error contacting assistant: ' + error.message }]);
      } finally {
        setIsAssistantTyping(false);
        chatInputRef.current?.focus();
      }
    } else {
      try {
        const response = await fetch('http://localhost:8000/api/guided/simple-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: [...chatMessages, userMessage],
          }),
        });
        const data = await response.json();
        if (data.response && data.response.content) {
          setChatMessages(prev => [...prev, { type: 'assistant', content: data.response.content }]);
        } else {
          setChatMessages(prev => [...prev, { type: 'system', content: 'Failed to get a response from the assistant.' }]);
        }
      } catch (error: any) {
        setChatMessages(prev => [...prev, { type: 'system', content: 'Error contacting assistant: ' + error.message }]);
      } finally {
        setIsAssistantTyping(false);
        chatInputRef.current?.focus();
      }
    }
  };

  const handleHint = async () => {
    // Check if guided project is active
    if (!guidedProject) {
      const message: ChatMessage = {
        type: 'assistant',
        content: '💡 To get AI hints and suggestions, please click the "Start Guided Project" button above. This will enable step-by-step guidance with AI-powered hints and fixes!'
      };
      setChatMessages(prev => [...prev, message]);
      return;
    }

    setIsAssistantTyping(true);
    try {
      setChatMessages(prev => [...prev, { type: 'system', content: 'Generating step-specific hint...' }]);

      const currentStep = guidedProject.steps[guidedProject.currentStep];
      
      const response = await fetch('http://localhost:8000/api/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: selectedFile?.content || '',
          language: selectedFile?.language || 'javascript',
          stepInstruction: currentStep.instruction,
          lineRanges: currentStep.lineRanges,
          stepId: currentStep.id
        }),
      });

      const result = await response.json();

      if (result.success && result.hint) {
        let hintMessageContent = `💡 Step ${currentStep.id} Hint: ${result.hint.hint_text}`;
        if (result.hint.line_number) {
          hintMessageContent += ` (Line: ${result.hint.line_number})`;
        }
        if (result.hint.detailed_explanation) {
          hintMessageContent += `\n\n${result.hint.detailed_explanation}`;
        }
        
        const hintMessage: ChatMessage = {
          type: 'system',
          content: hintMessageContent
        };
        setChatMessages(prev => [...prev, hintMessage]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { type: 'system', content: `Failed to get hint: ${result.error || 'Unknown error'}` }
        ]);
      }
    } catch (error) {
      console.error('Error generating hint:', error);
      const errorMessage: ChatMessage = { type: 'system', content: 'Sorry, I ran into an issue getting you a hint.' };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const handleSuggestFix = async () => {
    // Check if guided project is active
    if (!guidedProject) {
      const message: ChatMessage = {
        type: 'assistant',
        content: '🔧 To get AI-powered code fixes and suggestions, please click the "Start Guided Project" button above. This will enable step-by-step guidance with AI-powered analysis and fixes!'
      };
      setChatMessages(prev => [...prev, message]);
      return;
    }

    setIsAssistantTyping(true);
    try {
      setIsFixing(true);

      // Run analysis first to get errors
      const analysisMessage: ChatMessage = {
        type: 'assistant',
        content: '🔍 Let me analyze your code first to find issues that need fixing...'
      };
      setChatMessages(prev => [...prev, analysisMessage]);

      const response = await fetch('http://localhost:8000/api/code/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile?.content || '',
          language: selectedFile?.language || 'javascript',
          context: 'IDE analysis for fix suggestion'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const currentAnalysisResults = await response.json();
      setAnalysisResults(currentAnalysisResults);

      if (!currentAnalysisResults.errors || currentAnalysisResults.errors.length === 0) {
        const noErrorsMessage: ChatMessage = {
          type: 'assistant',
          content: '✅ Great news! No errors found in your code. Your code looks good to go!'
        };
        setChatMessages(prev => [...prev, noErrorsMessage]);
        return;
      }

      // Now proceed with fix suggestion.
      const firstError = currentAnalysisResults.errors[0];
      const fixResponse = await fetch('http://localhost:8000/api/code/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile?.content || '',
          language: selectedFile?.language || 'javascript',
          error_message: firstError.message,
          line_number: firstError.line_number
        }),
      });

      if (!fixResponse.ok) {
        throw new Error(`HTTP error! status: ${fixResponse.status}`);
      }

      const fixResult = await fixResponse.json();

      if (fixResult.success && fixResult.fixed_code) {
        // Only show the fix in the chat, do not update the code editor
        const fixMessage: ChatMessage = {
          type: 'assistant',
          content:
            '💡 Here is a suggested fix for your code:\n\n' +
            (fixResult.fixed_code
              ? `\`\`\`${selectedFile?.language}\n${fixResult.fixed_code}\n\`\`\`\n`
              : '') +
            (fixResult.explanation
              ? `**Explanation:**\n${fixResult.explanation}`
              : '')
        };
        setChatMessages(prev => [...prev, fixMessage]);
      } else if (fixResult.success && fixResult.code) {
        // fallback for some backends that use 'code' instead of 'fixed_code'
        const fixMessage: ChatMessage = {
          type: 'assistant',
          content:
            '💡 Here is a suggested fix for your code:\n\n' +
            `\`\`\`${selectedFile?.language}\n${fixResult.code}\n\`\`\`\n` +
            (fixResult.explanation
              ? `**Explanation:**\n${fixResult.explanation}`
              : '')
        };
        setChatMessages(prev => [...prev, fixMessage]);
      } else {
        const errorMessage: ChatMessage = {
          type: 'system',
          content: `❌ Failed to suggest a fix: ${fixResult.error || 'Unknown error'}`
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: any) {
      console.error('Error in handleSuggestFix:', error);
      const errorMessage: ChatMessage = { type: 'system', content: 'Sorry, I ran into an issue suggesting a fix.' };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsFixing(false);
      setIsAssistantTyping(false);
    }
  };

  const handleStartGuidedProject = async (description: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectDescription: description })
      });

      if (!response.ok) {
        throw new Error('Failed to start guided project');
      }

      const { projectId, steps, welcomeMessage }: { projectId: string; steps: Step[]; welcomeMessage: ChatMessage } = await response.json();
      
      setGuidedProject({
        projectId,
        steps,
        currentStep: 0
      });
      setIsGuidedModalOpen(false); // Close the submission modal

      setChatMessages(prev => [...prev, welcomeMessage]);
      setIsStepComplete(false);

    } catch (error) {
      console.error("Error starting guided project:", error);
      // Handle error (show toast notification, etc.)
    }
  };

  const handleAnalyzeStep = async () => {
    if (!guidedProject || isStepComplete) return;

    setIsAssistantTyping(true);
    try {
      const response = await fetch('http://localhost:8000/api/guided/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject.projectId,
          stepId: guidedProject.steps[guidedProject.currentStep].id,
          code: selectedFile?.content || '',
          language: selectedFile?.language || 'javascript'
        })
      });

      if (!response.ok) throw new Error('Failed to analyze step');

      const data = await response.json();
      setStepFeedback(data.feedback);
      
      const chatMessage: ChatMessage = data.chatMessage;
      setChatMessages(prev => [...prev, chatMessage]);

      // Check if all feedback items are correct
      const allCorrect = data.feedback.every((f: any) => f.correct);
      setIsStepComplete(allCorrect);

    } catch (error) {
      console.error('Error analyzing step:', error);
      const errorMessage: ChatMessage = {
        type: 'system',
        content: 'Sorry, I had trouble analyzing your code. Please try again.'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const handleNextStep = () => {
    if (!guidedProject || !isStepComplete) return;

    const nextStep = guidedProject.currentStep + 1;
    if (nextStep < guidedProject.steps.length) {
      setGuidedProject({
        ...guidedProject,
        currentStep: nextStep
      });
      setStepFeedback([]);
      setIsStepComplete(false); // Reset for the new step
      
      // Add next step message to chat
      const nextStepMessage: ChatMessage = {
        type: 'assistant',
        content: `Great! Let's move on to step ${nextStep + 1}:\n\n${guidedProject.steps[nextStep].instruction}\n\nI'll help you write the code in the specified line ranges.`
      };
      setChatMessages(prev => [...prev, nextStepMessage]);
    } else {
      // Project completed
      const completionMessage: ChatMessage = {
        type: 'assistant',
        content: "🎉 Congratulations! You've completed the project! Feel free to start a new project or continue exploring the IDE."
      };
      setChatMessages(prev => [...prev, completionMessage]);
      setGuidedProject(null);
      setStepFeedback([]);
    }
  };

  const handlePreviousStep = () => {
    if (!guidedProject) return;

    const previousStep = guidedProject.currentStep - 1;
    console.log('Previous step requested:', { currentStep: guidedProject.currentStep, previousStep });
    
    if (previousStep >= 0) {
      console.log('Going to previous step:', previousStep + 1);
      setGuidedProject({
        ...guidedProject,
        currentStep: previousStep
      });
      setStepFeedback([]);
      setIsStepComplete(false); // Reset for the previous step
      
      // Add previous step message to chat
      const previousStepMessage: ChatMessage = {
        type: 'assistant',
        content: `Let's go back to step ${previousStep + 1}:\n\n${guidedProject.steps[previousStep].instruction}\n\nYou can review and modify your code for this step.`
      };
      setChatMessages(prev => [...prev, previousStepMessage]);
    } 
  };

  const handleExitGuidedProject = () => {
    setGuidedProject(null);
    setStepFeedback([]);
    setIsStepComplete(false);
    
    // Add exit message to chat
    const exitMessage: ChatMessage = {
      type: 'assistant',
      content: '👋 You\'ve exited the guided project. You can start a new one anytime by clicking "Start Guided Project"!'
    };
    setChatMessages(prev => [...prev, exitMessage]);
  };

  const getRelatedFiles = () => {
    if (!selectedFile || selectedFile.name.split('.').pop()?.toLowerCase() !== 'html') {
      return {};
    }
    
    const cssFile = files.find(f => f.name.endsWith('.css'));
    const jsFile = files.find(f => f.name.endsWith('.js'));
    
    return {
      cssContent: cssFile?.content || '',
      jsContent: jsFile?.content || ''
    };
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between py-2 px-4 bg-gray-800 shadow-md">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-blue-400">CodeCraft IDE</h1>
          {guidedProject && (
            <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-md">
              <span className="text-sm text-gray-300">Step {guidedProject.currentStep + 1} of {guidedProject.steps.length}</span>
              <div className="w-24 bg-gray-600 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((guidedProject.currentStep + 1) / guidedProject.steps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <RunDropdown 
            files={files} 
            onRunFile={handleRunFile} 
            isRunning={isRunning || isPyodideLoading} 
          />
          
          {guidedProject ? (
            <button
              onClick={handleExitGuidedProject}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
            >
              <X className="h-4 w-4" />
              <span>Exit Project</span>
            </button>
          ) : (
            <button
              onClick={() => setIsGuidedModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
            >
              <BookOpen className="h-4 w-4" />
              <span>Start Guided Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 border-r border-gray-700">
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            selectedFileId={selectedFile?.id || null}
          />
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col bg-gray-850 border-r border-gray-700 h-full relative">
          <div className="flex justify-between items-center py-1 px-2 bg-gray-700">
            <span className="text-sm font-semibold">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </span>
            {showPreview && (
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm px-2 py-1 bg-gray-600 rounded hover:bg-gray-500"
              >
                Show Code
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {showPreview && selectedFile?.name.endsWith('.html') ? (
              <HTMLPreview 
                htmlContent={selectedFile.content || ''} 
                {...getRelatedFiles()}
              />
            ) : selectedFile ? (
              <MonacoEditor
                language={selectedFile.language || 'javascript'}
                value={selectedFile.content || ''}
                onChange={handleCodeChange}
                theme="vs-dark"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Code2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a file to start coding</p>
                </div>
              </div>
            )}
          </div>
          {guidedProject && (
            <GuidedStepPopup
              instruction={guidedProject.steps[guidedProject.currentStep].instruction}
              isComplete={isStepComplete}
              onNextStep={handleNextStep}
              onPreviousStep={handlePreviousStep}
              onCheckStep={handleAnalyzeStep}
              stepNumber={guidedProject.currentStep + 1}
              totalSteps={guidedProject.steps.length}
            />
          )}
        </div>

        {/* Output and Chat Area */}
        <div className="w-[450px] flex flex-col">
          {/* Output Window */}
          <div className="h-[400px] flex flex-col bg-gray-800 p-4 overflow-auto text-sm border-b border-gray-700">
            <h2 className="text-lg font-semibold mb-2">Output</h2>
            <pre className="flex-1 bg-gray-900 p-3 rounded-md overflow-auto text-sm text-gray-200">
              {isPyodideLoading && selectedFile?.language === 'python' ? 'Loading Python runtime (Pyodide)...' : output}
            </pre>
            
            {/* Interactive Input Field */}
            {isWaitingForInput && (
              <form onSubmit={handleInputSubmit} className="mt-3 flex items-center space-x-2">
                <span className="text-green-400 font-mono">$</span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                  placeholder="Enter your input..."
                  ref={inputRef}
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  Enter
                </button>
              </form>
            )}
            
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
              {isAssistantTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Action Buttons */}
            <div className="flex space-x-2 mb-3">
              <button
                onClick={handleSuggestFix}
                className={`flex items-center flex-1 px-4 py-2 rounded-md focus:outline-none text-white text-sm justify-center ${
                  isFixing || !selectedFile?.content?.trim()
                    ? 'bg-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-orange-600 hover:bg-orange-700 focus:ring-2 focus:ring-orange-500'
                }`}
                disabled={isFixing || !selectedFile?.content?.trim()}
                title={!selectedFile?.content?.trim() ? 'Add some code first to get AI suggestions' : 'Get AI suggestions to fix your code'}
              >
                {isFixing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                Suggest Fix
              </button>
              <button
                onClick={handleHint}
                className={`flex items-center flex-1 px-4 py-2 rounded-md focus:outline-none text-white text-sm justify-center ${
                  !selectedFile?.content?.trim()
                    ? 'bg-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500'
                }`}
                disabled={!selectedFile?.content?.trim()}
                title={!selectedFile?.content?.trim() ? 'Add some code first to get hints' : 'Get AI hints for your code'}
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
                ref={chatInputRef}
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

      <ProjectDescriptionModal
        isOpen={isGuidedModalOpen}
        onClose={() => setIsGuidedModalOpen(false)}
        onSubmit={handleStartGuidedProject}
      />
    </div>
  );
}