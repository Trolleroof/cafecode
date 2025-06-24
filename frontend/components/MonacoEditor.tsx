'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { OnChange } from '@monaco-editor/react';

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: OnChange;
  theme?: string;
  highlightedLines?: number[];
  onEditorMount?: (editor: any, monaco: any) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  language,
  value,
  onChange,
  theme = 'vs-dark',
  highlightedLines = [],
  onEditorMount,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
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

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
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
      }}
    />
  );
};

export default MonacoEditor;