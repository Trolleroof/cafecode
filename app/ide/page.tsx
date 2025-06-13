'use client';

import React, { useState } from 'react';
import { Play, MessageSquare, Lightbulb, Code2 } from 'lucide-react';
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
}

greetUser('Future Developer');`,

  python: `# Your first Python function
def greet_user(name):
    print(f"Hello, {name}! Welcome to coding!")

greet_user("Future Developer")`,

  html: `<!DOCTYPE html>
<html>
<head>
    <title>My First Page</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>Welcome to coding!</p>
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

  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId);
    setCode(defaultCode[langId as keyof typeof defaultCode]);
    setOutput('');
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');
    
    // Simulate code execution
    setTimeout(() => {
      if (selectedLanguage === 'javascript') {
        try {
          // Simple JavaScript execution simulation
          const logs: string[] = [];
          const originalLog = console.log;
          console.log = (...args) => {
            logs.push(args.join(' '));
          };
          
          // Basic eval for demo purposes (not secure for production)
          eval(code);
          
          console.log = originalLog;
          setOutput(logs.join('\n') || 'Code executed successfully (no output)');
        } catch (error) {
          setOutput(`Error: ${error}`);
        }
      } else {
        setOutput(`${selectedLanguage} execution would happen on the backend. Code ready to run!`);
      }
      setIsRunning(false);
    }, 1000);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { type: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        type: 'assistant',
        content: `I can help you with that! This is a placeholder response for: "${chatInput}". In the full version, I'll provide contextual hints about your code.`
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);

    setChatInput('');
  };

  const handleHint = () => {
    const hintMessage = {
      type: 'assistant',
      content: 'Here\'s a hint: Make sure your function names are descriptive and your syntax is correct. Check for missing semicolons in JavaScript or proper indentation in Python!'
    };
    setChatMessages(prev => [...prev, hintMessage]);
  };

  const handleSuggestFix = () => {
    const fixMessage = {
      type: 'assistant',
      content: 'I\'d suggest checking line 3 for a potential syntax error. In the full version, I\'ll provide specific line-by-line fixes you can apply with one click!'
    };
    setChatMessages(prev => [...prev, fixMessage]);
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

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
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
                className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                <Lightbulb className="h-3 w-3" />
                <span>Hint</span>
              </button>
              <button
                onClick={handleSuggestFix}
                className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded"
              >
                Suggest Fix
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
                {message.content}
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