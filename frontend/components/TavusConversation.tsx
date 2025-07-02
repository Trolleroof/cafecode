'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface TavusConversationProps {
  currentCode: string;
  currentLanguage: string;
  output: string[];
  projectFiles: any[];
  guidedProject: any;
  callObject?: any; // <-- Add this prop for the Daily call object
}

const TavusConversation: React.FC<TavusConversationProps> = ({ currentCode, currentLanguage, output, projectFiles, guidedProject, callObject }) => {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevGuidedProjectRef = useRef<any>(null);

  // Remove sendProjectContext and backend update-context call

  useEffect(() => {
    const existingConversationId = typeof window !== 'undefined' ? localStorage.getItem('tavus_conversation_id') : null;
    const existingConversationUrl = typeof window !== 'undefined' ? localStorage.getItem('tavus_conversation_url') : null;
    if (existingConversationId && existingConversationUrl) {
      setConversationId(existingConversationId);
      setConversationUrl(existingConversationUrl);
      setIsLoading(false);
      return;
    }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('tavus_conversation_id', data.conversation_id);
          localStorage.setItem('tavus_conversation_url', data.conversation_url);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    createConversation();
    // Cleanup: delete conversation on unmount
    return () => {
      const convId = typeof window !== 'undefined' ? localStorage.getItem('tavus_conversation_id') : null;
      if (convId) {
        fetch(`/api/tavus/delete-conversation`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convId })
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tavus_conversation_id');
          localStorage.removeItem('tavus_conversation_url');
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast context update via Daily App Message
  useEffect(() => {
    if (callObject && conversationId && guidedProject) {
      // Compose context string (example: just steps, but you can add more)
      let contextParts = [];
      if (guidedProject.steps && guidedProject.steps.length > 0) {
        contextParts.push(
          'Project Goals/Steps:\n' +
            guidedProject.steps.map((step: any, idx: number) => `Step ${idx + 1}: ${step.instruction}`).join('\n')
        );
      }
      if (currentCode && currentLanguage) {
        contextParts.push(`Current Code (${currentLanguage}):\n\
\
${currentCode}`);
      }
      if (output && output.length > 0) {
        contextParts.push('Recent Output:\n' + output.join('\n'));
      }
      if (projectFiles && projectFiles.length > 0) {
        const filesInfo = projectFiles.map((file: any) => `${file.name} (${file.type})`).join(', ');
        contextParts.push('Project Files: ' + filesInfo);
      }
      const conversationalContext = contextParts.join('\n\n');
      // Send the event
      callObject.sendAppMessage(
        {
          message_type: 'conversation',
          event_type: 'conversation.overwrite_llm_context',
          conversation_id: conversationId,
          properties: {
            context: conversationalContext
          }
        },
        '*'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callObject, conversationId, guidedProject, currentCode, currentLanguage, output, projectFiles]);

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