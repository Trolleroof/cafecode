'use client';

import React from 'react';
import Editor, { OnChange } from '@monaco-editor/react';

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange: OnChange;
  theme?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  language,
  value,
  onChange,
  theme = 'vs-dark',
}) => {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme={theme}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
};

export default MonacoEditor; 