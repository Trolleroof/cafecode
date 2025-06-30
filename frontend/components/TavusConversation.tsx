'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface TavusConversationProps {
  currentCode: string;
  currentLanguage: string;
  output: string[];
  projectFiles: any[];
  guidedProject: any;
}

const TavusConversation: React.FC<TavusConversationProps> = ({ currentCode, currentLanguage, output, projectFiles, guidedProject }) => {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevGuidedProjectRef = useRef<any>(null);

  // Helper to send only project context to backend
  const sendProjectContext = async (convId: string, project: any) => {
    if (!project) return;
    await fetch('/api/tavus/update-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: convId,
        guidedProject: {
          description: project.description,
          steps: project.steps
        }
      })
    });
  };

  useEffect(() => {
    const createConversation = async () => {
      try {
        const response = await fetch('/api/tavus/create-conversation', {
          method: 'POST',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to create conversation');
        }
        const data = await response.json();
        setConversationUrl(data.conversation_url);
        setConversationId(data.conversation_id);
        // Send initial project context
        if (data.conversation_id && guidedProject) {
          await sendProjectContext(data.conversation_id, guidedProject);
          prevGuidedProjectRef.current = guidedProject;
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    createConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only update context if guidedProject changes (not on every code/output change)
  useEffect(() => {
    if (
      conversationId &&
      guidedProject &&
      prevGuidedProjectRef.current !== guidedProject
    ) {
      sendProjectContext(conversationId, guidedProject);
      prevGuidedProjectRef.current = guidedProject;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedProject, conversationId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-medium-coffee mb-4" />
        <p className="text-deep-espresso font-semibold">Connecting to Voice Assistant...</p>
        <p className="text-medium-coffee text-sm">Please wait a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
        <p className="text-deep-espresso font-semibold">Connection Failed</p>
        <p className="text-red-600 text-sm bg-red-100 p-2 rounded-md">{error}</p>
      </div>
    );
  }

  if (conversationUrl) {
    return (
      <div className="w-full h-full bg-dark-charcoal">
        <iframe
          src={conversationUrl}
          allow="camera; microphone; fullscreen; speaker; display-capture"
          className="w-full h-full border-0"
        ></iframe>
      </div>
    );
  }

  return null;
};

export default TavusConversation; 