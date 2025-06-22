'use client';

import React, { useEffect, useRef } from 'react';

interface HTMLPreviewProps {
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
}

export default function HTMLPreview({ htmlContent, cssContent, jsContent }: HTMLPreviewProps) {
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
        
        // Inject JavaScript if provided
        if (jsContent) {
          styledHtml = styledHtml.replace(
            '</body>',
            `<script>${jsContent}</script></body>`
          );
        }
        
        doc.open();
        doc.write(styledHtml);
        doc.close();
      }
    }
  }, [htmlContent, cssContent, jsContent]);

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