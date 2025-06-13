'use client';

import React, { useState } from 'react';
import { Play, MessageSquare, Lightbulb, Code2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const languages = [
  { id: 'javascript', name: 'JavaScript', extension: '.js' },
  { id: 'python', name: 'Python', extension: '.py' },
  { id: 'html', name: 'HTML', extension: '.html' }
];

const defaultCode = {
  javascript: `// Your first JavaScript function
function greetUser(name) {
  console.log(\`Hello, \${name}! Welcome to coding!\`);
  return \`Welcome, \${name}!\`;
}

// Call the function
const result = greetUser('Future Developer');
console.log(result);`,

  python: `# Your first Python function
def greet_user(name):
    message = f"Hello, {name}! Welcome to coding!"
    print(message)
    return message

# Call the function
result = greet_user("Future Developer")
print(f"Result: {result}")`,

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

export default function IDEPage() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [code, setCode] = useState(defaultCode.javascript);
  const router = useRouter();
  const [output, setOutput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { type: 'system', content: 'Welcome! I\'m here to help you learn to code. Ask me for hints or help with errors!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId);
    setCode(defaultCode[langId as keyof typeof defaultCode]);
    setOutput('');
    setAnalysisResults(null);
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

  const executePython = (code: string) => {
    // Simulate Python execution by parsing basic print statements
    const lines = code.split('\n');
    const outputs: string[] = [];
    
    try {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('print(')) {
          // Extract content from print statement
          const match = trimmed.match(/print\((.*)\)/);
          if (match) {
            let content = match[1];
            // Handle f-strings and basic string formatting
            if (content.includes('f"') || content.includes("f'")) {
              content = content.replace(/f["'](.*)["']/, '$1');
              content = content.replace(/\{([^}]+)\}/g, (_, expr) => {
                if (expr.includes('name')) return 'Future Developer';
                return expr;
              });
            }
            // Remove quotes
            content = content.replace(/^["']|["']$/g, '');
            outputs.push(content);
          }
        }
      }
      
      return outputs.length > 0 ? outputs.join('\n') : '✅ Python code executed successfully (no output)';
    } catch (error) {
      return `❌ Python Error: ${error}`;
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

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('🚀 Running code...\n');
    
    // Simulate execution delay
    setTimeout(() => {
      let result = '';
      
      switch (selectedLanguage) {
        case 'javascript':
          result = executeJavaScript(code);
          break;
        case 'python':
          result = executePython(code);
          break;
        case 'html':
          result = executeHTML(code);
          break;
        default:
          result = `${selectedLanguage} execution not implemented yet`;
      }
      
      setOutput(result);
      setIsRunning(false);
    }, 1000);
  };

  const analyzeCode = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/code/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: selectedLanguage,
          context: 'IDE analysis request'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResults(result);
      
      // Add analysis results to chat
      const analysisMessage = {
        type: 'assistant',
        content: `📊 Code Analysis Complete!\n\n` +
          `Quality Score: ${result.code_quality_score}/100\n` +
          `Errors: ${result.errors.length}\n` +
          `Warnings: ${result.warnings.length}\n\n` +
          `${result.analysis_summary}`
      };
      setChatMessages(prev => [...prev, analysisMessage]);

      if (result.errors.length > 0) {
        const errorDetails = result.errors.map((error: any, index: number) => 
          `${index + 1}. ${error.message} (Line ${error.line_number || 'unknown'})`
        ).join('\n');
        
        const errorMessage = {
          type: 'assistant',
          content: `🚨 Errors Found:\n${errorDetails}`
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMessage = {
        type: 'assistant',
        content: `❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend server is running on port 8000.`
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestFix = async () => {
    if (!analysisResults || analysisResults.errors.length === 0) {
      const message = {
        type: 'assistant',
        content: '✅ No errors found to fix! Run code analysis first if you suspect there are issues.'
      };
      setChatMessages(prev => [...prev, message]);
      return;
    }

    setIsFixing(true);

    try {
      const firstError = analysisResults.errors[0];
      const response = await fetch('http://localhost:8000/api/code/fix', {
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.fixed_code !== code) {
        // Update the code with the fix
        setCode(result.fixed_code);
        
        const fixMessage = {
          type: 'assistant',
          content: `🔧 Code Fixed!\n\n` +
            `Confidence: ${result.confidence_score}%\n\n` +
            `${result.explanation}\n\n` +
            `Applied ${result.fixes_applied.length} fix(es). The code has been updated in the editor.`
        };
        setChatMessages(prev => [...prev, fixMessage]);
        
        // Clear previous analysis results since code has changed
        setAnalysisResults(null);
      } else {
        const message = {
          type: 'assistant',
          content: `🤔 ${result.explanation || 'No fixes could be applied automatically.'}`
        };
        setChatMessages(prev => [...prev, message]);
      }

    } catch (error) {
      console.error('Fix failed:', error);
      const errorMessage = {
        type: 'assistant',
        content: `❌ Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend server is running on port 8000.`
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsFixing(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);

    // Simulate AI response based on input
    setTimeout(() => {
      let aiResponse = '';
      const input = chatInput.toLowerCase();
      
      if (input.includes('error') || input.includes('bug')) {
        aiResponse = 'I can help you debug! Try using the "Analyze Code" button to get detailed error analysis, or click "Suggest Fix" if you already know there\'s an error.';
      } else if (input.includes('help') || input.includes('how')) {
        aiResponse = 'I\'m here to help! You can:\n• Write code in the editor\n• Click "Run" to execute it\n• Use "Analyze Code" to check for issues\n• Use "Suggest Fix" to get automatic fixes\n• Ask me specific questions about your code';
      } else if (input.includes('syntax')) {
        aiResponse = 'For syntax help, make sure to:\n• Check your brackets and parentheses\n• Verify proper indentation (especially in Python)\n• Ensure semicolons where needed (JavaScript)\n• Use proper quotes for strings';
      } else {
        aiResponse = `I understand you're asking about: "${chatInput}". While I'm a demo assistant, in the full version I would provide contextual help based on your code and specific questions!`;
      }

      const response = { type: 'assistant', content: aiResponse };
      setChatMessages(prev => [...prev, response]);
    }, 1000);

    setChatInput('');
  };

  const handleHint = () => {
    const hints = [
      'Make sure your function names are descriptive and your syntax is correct.',
      'Check for missing semicolons in JavaScript or proper indentation in Python.',
      'Remember to close all brackets and parentheses.',
      'Use console.log() in JavaScript or print() in Python to see output.',
      'Test your code with different inputs to make sure it works correctly.'
    ];
    
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    const hintMessage = {
      type: 'assistant',
      content: `💡 Hint: ${randomHint}`
    };
    setChatMessages(prev => [...prev, hintMessage]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push('/')}>
              <Code2 className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-semibold">
                CodeCraft IDE
              </span>
            </div>
            
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={analyzeCode}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
              <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Code'}</span>
            </button>

            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Editor Section */}
        <div className="flex-1 flex flex-col">
          {/* Code Editor */}
          <div className="flex-1 p-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full font-mono text-sm border border-gray-300 rounded p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write your code here..."
              spellCheck={false}
            />
          </div>

          {/* Output Section */}
          <div className="h-48 border-t border-gray-200 bg-gray-900 text-green-400 p-4">
            <div className="text-sm font-semibold mb-2 text-gray-300">Output:</div>
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {output || 'Click "Run" to execute your code...'}
            </pre>
          </div>
        </div>

        {/* Chat Pane */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>AI Assistant</span>
            </h2>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={handleHint}
                className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                <Lightbulb className="h-3 w-3" />
                <span>Hint</span>
              </button>
              <button
                onClick={suggestFix}
                disabled={isFixing}
                className="flex items-center space-x-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 disabled:opacity-50"
              >
                {isFixing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                <span>{isFixing ? 'Fixing...' : 'Suggest Fix'}</span>
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded text-sm ${
                  message.type === 'user'
                    ? 'bg-blue-100 text-blue-900 ml-4'
                    : message.type === 'system'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-green-100 text-green-900 mr-4'
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask for help"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}