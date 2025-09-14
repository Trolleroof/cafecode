'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnChange } from '@monaco-editor/react';
import { Save, Check } from 'lucide-react';

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: OnChange;
  theme?: string;
  highlightedLines?: number[];
  onEditorMount?: (editor: any, monaco: any) => void;
  readOnly?: boolean;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  language,
  value,
  onChange,
  theme = 'vs-dark',
  highlightedLines = [],
  onEditorMount,
  readOnly = false,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const [isSaved, setIsSaved] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Handle save action
  const handleSave = () => {
    if (editorRef.current && onChange) {
      const currentValue = editorRef.current.getValue();
      onChange(currentValue, {} as any);
      setIsSaved(true);
      setHasChanges(false);
    }
  };

  // Custom onChange handler to track changes
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      if (newValue !== value) {
        setHasChanges(true);
        setIsSaved(false);
      } else {
        setHasChanges(false);
        setIsSaved(true);
      }
    }
    onChange(newValue, {} as any);
  };

  // Reset save state when value changes externally
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue === value) {
        setIsSaved(true);
        setHasChanges(false);
      } else {
        setIsSaved(false);
        setHasChanges(true);
      }
    }
  }, [value]);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add Cmd+S / Ctrl+S to trigger a global save (handled by IDE page)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      try { window.dispatchEvent(new CustomEvent('saveFile')); } catch {}
      handleSave(); // keep local state in sync (saved indicator inside editor)
    });
    
    // Configure TypeScript for better IntelliSense while avoiding worker errors
    try {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
      });
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
      });
      
      // Enable basic language features
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      });
      
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
      });
      
      // Disable worker features that cause the inmemory model errors
      monaco.languages.typescript.javascriptDefaults.setWorkerOptions({
        customWorkerPath: undefined,
      });
      monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
        customWorkerPath: undefined,
      });
    } catch (e) {
      console.warn('Could not configure Monaco TypeScript options:', e);
    }
    
    // Register custom language configurations if not already registered
    const registeredLanguages = monaco.languages.getLanguages().map((l: any) => l.id);
    
    // Add support for additional file types that Monaco might not have by default
    const customLanguages = [
      { id: 'dockerfile', extensions: ['dockerfile'], aliases: ['Dockerfile'] },
      { id: 'makefile', extensions: ['makefile'], aliases: ['Makefile'] },
      { id: 'toml', extensions: ['.toml'], aliases: ['TOML'] },
      { id: 'dotenv', extensions: ['.env'], aliases: ['Environment'] }
    ];
    
    customLanguages.forEach(lang => {
      if (!registeredLanguages.includes(lang.id)) {
        monaco.languages.register(lang);
      }
    });

    // Ensure JSX/TSX have proper defaults regardless of id mapping
    try {
      // Enable JS/TS defaults to understand JSX syntax when needed
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        allowJs: true,
        checkJs: false,
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
      });
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        allowJs: true,
        jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
      });
    } catch {}
    
    if (onEditorMount) {
      onEditorMount(editor, monaco);
    }
  };

  // Update line highlighting when highlightedLines changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && highlightedLines.length > 0) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      // Clear previous decorations
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

      // Create new decorations for highlighted lines
      const newDecorations = highlightedLines.map(lineNumber => ({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'highlighted-code-line',
          glyphMarginClassName: 'highlighted-code-line-glyph'
        }
      }));

      // Apply new decorations
      decorationsRef.current = editor.deltaDecorations([], newDecorations);

      // Scroll to the first highlighted line
      if (highlightedLines.length > 0) {
        editor.revealLineInCenter(highlightedLines[0]);
      }
    } else if (editorRef.current && highlightedLines.length === 0) {
      // Clear all decorations when no lines should be highlighted
      const editor = editorRef.current;
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  }, [highlightedLines]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          model.dispose();
        }
      }
    };
  }, []);

  return (
    <div className="relative h-full">

      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleEditorChange}
        theme={theme}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          readOnly: readOnly,
          // Enable autosuggestions and IntelliSense
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'currentDocument',
          parameterHints: { enabled: true },
          hover: { enabled: true },
          // Enable basic language features
          'semanticHighlighting.enabled': true,
          // Add padding to the editor
          padding: { top: 16, bottom: 16 },
          // Improve suggestions
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showIssues: true,
            showUsers: true,
            showWords: true
          }
        }}
      />
    </div>
  );
};

export default MonacoEditor;
