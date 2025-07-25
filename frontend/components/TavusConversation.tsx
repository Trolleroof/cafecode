'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface TavusConversationProps {
  currentCode: string;
  currentLanguage: string;
  output: string[];
  projectFiles: any[];
  guidedProject: any;
  callObject?: any; 
}

const TavusConversation: React.FC<TavusConversationProps> = ({ currentCode, currentLanguage, output, projectFiles, guidedProject, callObject }) => {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false); // Track iframe load errors
  const lastProjectIdRef = useRef<string | null>(null);
  const isCreatingConversation = useRef(false);
  const { session } = useAuth();

  // Helper to clear localStorage and state
  const clearConversation = () => {
    setConversationId(null);
    setConversationUrl(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tavus_conversation_id');
      localStorage.removeItem('tavus_conversation_url');
    }
  };

  // Only create conversation when guidedProject and guidedProject.projectContext are available
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).process && (window as any).process.stdout) {
      (window as any).process.stdout.write('[TAVUS DEBUG] useEffect triggered\n');
      (window as any).process.stdout.write('[TAVUS DEBUG] guidedProject: ' + JSON.stringify(guidedProject) + '\n');
      (window as any).process.stdout.write('[TAVUS DEBUG] conversationId: ' + conversationId + '\n');
      (window as any).process.stdout.write('[TAVUS DEBUG] conversationUrl: ' + conversationUrl + '\n');
      (window as any).process.stdout.write('[TAVUS DEBUG] lastProjectIdRef: ' + lastProjectIdRef.current + '\n');
    }
    if (!guidedProject || !guidedProject.projectContext) return;
    if (lastProjectIdRef.current === guidedProject.projectId) {
      if (typeof window !== 'undefined' && (window as any).process && (window as any).process.stdout) {
        (window as any).process.stdout.write('[TAVUS DEBUG] Skipping creation: projectId already used\n');
      }
      return;
    }
    if (conversationId !== null || conversationUrl !== null) {
      if (typeof window !== 'undefined' && (window as any).process && (window as any).process.stdout) {
        (window as any).process.stdout.write('[TAVUS DEBUG] Skipping creation: conversationId or conversationUrl already set\n');
      }
      return;
    }
    if (isCreatingConversation.current) return; // Prevent double POSTs

    const existingConversationId = typeof window !== 'undefined' ? localStorage.getItem('tavus_conversation_id') : null;
    const existingConversationUrl = typeof window !== 'undefined' ? localStorage.getItem('tavus_conversation_url') : null;
    if (existingConversationId && existingConversationUrl) {
      if (typeof window !== 'undefined' && (window as any).process && (window as any).process.stdout) {
        (window as any).process.stdout.write('[TAVUS DEBUG] Reusing existing conversation from localStorage\n');
      }
      setConversationId(existingConversationId);
      setConversationUrl(existingConversationUrl);
      setIsLoading(false);
      lastProjectIdRef.current = guidedProject.projectId;
      return;
    }

    const createConversation = async () => {
      isCreatingConversation.current = true;
      try {
        if (typeof window !== 'undefined' && (window as any).process && (window as any).process.stdout) {
          (window as any).process.stdout.write('[TAVUS DEBUG] Creating new Tavus conversation via API\n');
        }
        const response = await fetch('/api/tavus/create-conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            conversational_context: guidedProject.projectContext,
            currentCode,
            currentLanguage,
            output,
            projectFiles,
            persona_id: process.env.NEXT_PUBLIC_TAVUS_PERSONA_ID!,
            replica_id: process.env.NEXT_PUBLIC_TAVUS_REPLICA_ID!,
          })
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
        lastProjectIdRef.current = guidedProject.projectId;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
        isCreatingConversation.current = false;
      }
    };
    createConversation();
    return () => {
      const convId = typeof window !== 'undefined' ? localStorage.getItem('tavus_conversation_id') : null;
      if (convId) {
        fetch(`/api/tavus/delete-conversation`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ conversationId: convId })
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('tavus_conversation_id');
          localStorage.removeItem('tavus_conversation_url');
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guidedProject]);

  // If the iframe fails to load (e.g., Tavus returns 404), clear and recreate
  const handleIframeError = () => {
    setIframeError(true);
    clearConversation();
  };

  // If iframeError is set, try to create a new conversation
  useEffect(() => {
    if (iframeError) {
      setError('Previous Tavus conversation was invalid or expired. Creating a new one...');
      setIframeError(false);
      setIsLoading(true);
      setTimeout(() => {
        setConversationId(null);
        setConversationUrl(null);
      }, 100); // Triggers useEffect to create a new conversation
    }
  }, [iframeError]);

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
          onError={handleIframeError}
        ></iframe>
      </div>
    );
  }

  return null;
};

export default TavusConversation; 