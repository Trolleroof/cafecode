'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import 'xterm/css/xterm.css';
import { supabase } from '../lib/supabase';

//the fly backend url should be kept like this for prod, and the localhost backend should be kept for local version and testing
// const WS_BASE_URL = 'wss://cafecode-backend-v2.fly.dev/terminal';
const WS_BASE_URL = 'ws://localhost:8000/terminal'

type TerminalTab = {
  id: string;
  title: string;
  xterm: XTerm | null;
  fit: FitAddon | null;
  ws: WebSocket | null;
  resizeObserver?: ResizeObserver;
  isAttached: boolean;
};

const createTerminalId = () => `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const Terminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const addTab = useCallback(() => {
    const newId = createTerminalId();
    const newTab: TerminalTab = { 
      id: newId, 
      title: `Terminal ${tabs.length + 1}`, 
      xterm: null, 
      fit: null, 
      ws: null,
      isAttached: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveId(newId);
  }, [tabs.length]);

  // Fetch access token once
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Terminal] Auth session:', session ? 'Found' : 'None', 'Token length:', session?.access_token?.length || 0);
      setAccessToken(session?.access_token ?? null);
    })();
  }, []);

  // Create initial tab when access token is available
  useEffect(() => {
    if (accessToken && tabs.length === 0) {
      addTab();
    }
  }, [accessToken, tabs.length, addTab]);

  const attachXterm = useCallback((tabId: string, node: HTMLDivElement | null) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !node || tab.isAttached) return;

    const term = new XTerm({
      cols: 80,
      rows: 24,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#ffffff',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      },
      allowTransparency: true,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4,
      wordSeparator: ' ()[]{}\',"`',
      scrollOnUserInput: true,
      scrollSensitivity: 1,
      fastScrollModifier: 'alt',
      fastScrollSensitivity: 5
    });
    
    const fitAddon = new FitAddon();
    const clipboardAddon = new ClipboardAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(clipboardAddon);
    term.open(node);
    
    // Ensure proper sizing and fit
    setTimeout(() => {
      fitAddon.fit();
      // Send initial size to backend
      const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    }, 100);

    // Add resize observer to handle dynamic resizing
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    });
    resizeObserver.observe(node);

    // Create WebSocket connection
    let ws: WebSocket | null = null;
    if (accessToken) {
      console.log(`[Terminal] Connecting WebSocket for tab ${tabId} with token length:`, accessToken.length);
      ws = new WebSocket(`${WS_BASE_URL}?access_token=${accessToken}&terminal_id=${tabId}`);
      ws.onopen = () => {
        console.log(`[Terminal] WebSocket connected for tab ${tabId}`);
        // Send size after connection is established
        if (fitAddon) {
          const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
          ws?.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
        }
      };
      ws.onmessage = (event) => {
        term.write(event.data);
        // Auto-scroll to bottom when new content arrives
        term.scrollToBottom();
      };
      ws.onclose = () => term.writeln('\r\n🖧 Terminal has been disconnected. PLEASE RELOAD.');

      term.onData((data) => {
        if (ws && ws.readyState === 1) {
          ws.send(data);
          // Auto-scroll to bottom when user types
          term.scrollToBottom();
        }
      });
    } else {
      term.writeln('🔄 Waiting for authentication...');
    }

    // Store terminal, fitAddon, ws and observer in the tabs state
    setTabs(prev => prev.map(t => t.id === tabId ? { 
      ...t, 
      xterm: term, 
      fit: fitAddon, 
      ws, 
      resizeObserver,
      isAttached: true
    } : t));
  }, [accessToken, tabs]);

  // Re-attach terminals when access token becomes available
  useEffect(() => {
    if (accessToken && tabs.length > 0) {
      console.log(`[Terminal] Access token available, re-attaching ${tabs.length} tabs`);
      tabs.forEach(tab => {
        if (tab.xterm && !tab.ws && !tab.isAttached) {
          console.log(`[Terminal] Re-attaching WebSocket for tab ${tab.id}`);
          const ws = new WebSocket(`${WS_BASE_URL}?access_token=${accessToken}&terminal_id=${tab.id}`);
          ws.onopen = () => {
            console.log(`[Terminal] Re-attached WebSocket connected for tab ${tab.id}`);
            if (tab.fit) {
              const dims = tab.fit.proposeDimensions() || { cols: 80, rows: 24 };
              ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
            // Clear the "waiting for auth" message
            tab.xterm?.clear();
          };
          ws.onmessage = (event) => tab.xterm?.write(event.data);
          ws.onclose = () => tab.xterm?.writeln('\r\n🖧 Terminal has been disconnected. PLEASE RELOAD');

          tab.xterm.onData((data) => {
            if (ws.readyState === 1) ws.send(data);
          });

          // Update the tab with the new WebSocket
          setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, ws } : t));
          
          // Re-fit the terminal after re-attachment
          setTimeout(() => {
            if (tab.fit) {
              tab.fit.fit();
              const dims = tab.fit.proposeDimensions() || { cols: 80, rows: 24 };
              ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
          }, 100);
        }
      });
    }
  }, [accessToken, tabs]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (tab) {
        try { tab.ws?.close(); } catch (_) {}
        try { tab.xterm?.dispose(); } catch (_) {}
        try { tab.resizeObserver?.disconnect(); } catch (_) {}
      }
      const next = prev.filter(t => t.id !== tabId);
      if (activeId === tabId) {
        setActiveId(next.length ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeId]);

  const renameTab = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title } : t));
  }, []);

  // Handle window resize for active tab
  useEffect(() => {
    const onResize = () => {
      const active = tabs.find(t => t.id === activeId);
      if (active && active.fit && active.xterm && active.ws && active.ws.readyState === 1) {
        active.fit.fit();
        const dims = active.fit.proposeDimensions() || { cols: 80, rows: 24 };
        active.ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeId, tabs]);
  
  // Handle tab switching - ensure terminal is properly sized when tab becomes active
  useEffect(() => {
    if (activeId) {
      const activeTab = tabs.find(t => t.id === activeId);
      if (activeTab && activeTab.fit && activeTab.xterm) {
        // Small delay to ensure the DOM has updated visibility
        setTimeout(() => {
          try {
            // Refresh the terminal display
            activeTab.xterm?.refresh(0, activeTab.xterm.rows - 1);
            // Ensure terminal is properly sized
            activeTab.fit?.fit();
            // Send updated size to backend
            if (activeTab.ws && activeTab.ws.readyState === 1 && activeTab.fit) {
              const dims = activeTab.fit.proposeDimensions() || { cols: 80, rows: 24 };
              activeTab.ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
          } catch (e) {
            console.error('[Terminal] Error refreshing terminal:', e);
          }
        }, 50);
      }
    }
  }, [activeId, tabs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tabs.forEach(t => {
        try { t.ws?.close(); } catch (_) {}
        try { t.xterm?.dispose(); } catch (_) {}
        try { t.resizeObserver?.disconnect(); } catch (_) {}
      });
    };
  }, [tabs]);

  return (
    <div style={{ backgroundColor: 'rgb(0, 0, 0)', paddingTop: '2px', width: '100%', height: 400 }}>
      {/* Tabs header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderBottom: '1px solid #222', backgroundColor: '#000' }}>
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <div key={tab.id} onClick={() => setActiveId(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginRight: '2px',
              cursor: 'pointer', borderRadius: 4,
              backgroundColor: activeId === tab.id ? '#111' : 'transparent',
              borderTop: activeId === tab.id ? '2px solid #007acc' : 'none',
              color: '#ddd'
            }}>
              <span>{tab.title}</span>
              <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={addTab} style={{background: 'transparent', color: '#ddd', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '6px'}}>+</button>
      </div>

      {/* Active terminal surface */}
      <div ref={containerRef} style={{ width: '100%', height: 'calc(100% - 36px)' }}>
        {tabs.map(tab => (
          <div key={tab.id} style={{ display: activeId === tab.id ? 'block' : 'none', width: '100%', height: '100%' }}>
            <div 
              ref={(node) => {
                // Only attach xterm if it hasn't been attached yet and node exists
                if (!tab.isAttached && node) {
                  attachXterm(tab.id, node);
                }
              }} 
              style={{ width: '100%', height: '100%', paddingBottom: '20px' }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal; 