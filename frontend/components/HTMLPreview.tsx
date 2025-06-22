'use client';

import React, { useEffect, useRef } from 'react';

interface HTMLPreviewProps {
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  onConsoleLog?: (message: string) => void;
}

export default function HTMLPreview({ htmlContent, cssContent, jsContent, onConsoleLog }: HTMLPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        // Inject CSS if provided
        let styledHtml = htmlContent;
        if (cssContent) {
          styledHtml = htmlContent.replace(
            '</head>',
            `<style>${cssContent}</style></head>`
          );
        }
        
        // Inject console log capture script and user JavaScript
        if (jsContent || onConsoleLog) {
          const consoleScript = onConsoleLog ? `
            // Override console.log to capture messages
            (function() {
              const originalLog = console.log;
              const originalError = console.error;
              const originalWarn = console.warn;
              
              console.log = function(...args) {
                originalLog.apply(console, args);
                const message = args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                window.parent.postMessage({
                  type: 'console.log',
                  message: message
                }, '*');
              };
              
              console.error = function(...args) {
                originalError.apply(console, args);
                const message = args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                window.parent.postMessage({
                  type: 'console.error',
                  message: message
                }, '*');
              };
              
              console.warn = function(...args) {
                originalWarn.apply(console, args);
                const message = args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');
                window.parent.postMessage({
                  type: 'console.warn',
                  message: message
                }, '*');
              };
              
              // Capture uncaught errors
              window.addEventListener('error', function(event) {
                window.parent.postMessage({
                  type: 'console.error',
                  message: 'Uncaught Error: ' + event.message + ' at line ' + event.lineno
                }, '*');
              });
            })();
          ` : '';
          
          const fullScript = consoleScript + (jsContent || '');
          
          styledHtml = styledHtml.replace(
            '</body>',
            `<script>${fullScript}</script></body>`
          );
        }
        
        doc.open();
        doc.write(styledHtml);
        doc.close();
      }
    }
  }, [htmlContent, cssContent, jsContent, onConsoleLog]);

  // Set up message listener for console logs from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type && onConsoleLog) {
        const { type, message } = event.data;
        if (type === 'console.log') {
          onConsoleLog(`[HTML Console]: ${message}`);
        } else if (type === 'console.error') {
          onConsoleLog(`[HTML Error]: ${message}`);
        } else if (type === 'console.warn') {
          onConsoleLog(`[HTML Warning]: ${message}`);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onConsoleLog]);

  return (
    <div className="h-full bg-white">
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <span className="text-sm font-medium text-gray-700">Preview</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="HTML Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}