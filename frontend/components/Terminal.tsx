'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import 'xterm/css/xterm.css';
import { useAuth } from '@/app/security/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getFreshAccessToken } from '@/lib/authToken';

// WebSocket URL Configuration
// Use localhost when NEXT_PUBLIC_USE_LOCALHOST=true, otherwise use production
const WS_BASE_URL = 'wss://cafecode-backend-v2.fly.dev/terminal';


type TerminalTab = {
  id: string;
  title: string;
  xterm: XTerm | null;
  fit: FitAddon | null;
  ws: WebSocket | null;
  resizeObserver?: ResizeObserver;
  isAttached: boolean;
  onDataDispose?: { dispose: () => void } | null;
  // Bootstrapping state to hide noisy setup output
  isBootstrapping: boolean;
  bootBuffer?: string;
  bootTimer?: ReturnType<typeof setTimeout> | null;
};

const createTerminalId = () => `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// Helper function to get websocket status as a readable string
const getWebSocketStatus = (ws: WebSocket | null): string => {
  if (!ws) return 'No WebSocket';
  
  switch (ws.readyState) {
    case WebSocket.CONNECTING:
      return 'Connecting';
    case WebSocket.OPEN:
      return 'Connected';
    case WebSocket.CLOSING:
      return 'Closing';
    case WebSocket.CLOSED:
      return 'Closed';
    default:
      return 'Unknown';
  }
};

// Helper function to log websocket status for all tabs
const logWebSocketStatus = (tabs: TerminalTab[], activeId: string | null) => {
  console.log('🔄 Terminal Tab Switch - WebSocket Status:');
  console.log(`Active Tab: ${activeId || 'None'}`);
  
  tabs.forEach((tab, index) => {
    const status = getWebSocketStatus(tab.ws);
    const isActive = tab.id === activeId;
    console.log(`  Tab ${index + 1} (${tab.id}): ${status}${isActive ? ' [ACTIVE]' : ''}`);
  });
  console.log('---');
};

const Terminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { session } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addTab = useCallback(() => {
    if (isInitializing) return; // Prevent multiple simultaneous initializations
    
    const newId = createTerminalId();
    const newTab: TerminalTab = { 
      id: newId, 
      title: `Terminal ${tabs.length + 1}`, 
      xterm: null, 
      fit: null, 
      ws: null,
      isAttached: false,
      onDataDispose: null,
      isBootstrapping: true,
      bootBuffer: '',
      bootTimer: null
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveId(newId);
  }, [tabs.length, isInitializing]);

  // Function to handle tab switching
  const switchToTab = useCallback((tabId: string) => {
    setActiveId(tabId);
  }, []);

  // Create initial tab when access token is available
  useEffect(() => {
    if (session?.access_token && tabs.length === 0) {
      addTab();
    }
  }, [session?.access_token, tabs.length, addTab]);

  const attachXterm = useCallback((tabId: string, node: HTMLDivElement | null) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !node || tab.isAttached || isInitializing) return;

    setIsInitializing(true);

    try {
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
        fastScrollSensitivity: 5,
        // Performance optimizations
        disableStdin: false,
        convertEol: true
      });
      
      const fitAddon = new FitAddon();
      const clipboardAddon = new ClipboardAddon();
      
      // Load addons before opening
      term.loadAddon(fitAddon);
      term.loadAddon(clipboardAddon);
      term.open(node);
      
      // Optimized sizing with requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
          
          const openWebSocket = async () => {
            // Avoid parallel connection attempts per tab
            const token = await getFreshAccessToken(supabase);
            if (!token) {
              term.writeln('🔄 Waiting for authentication...');
              return;
            }

            const ws = new WebSocket(`${WS_BASE_URL}?access_token=${encodeURIComponent(token)}&terminal_id=${tabId}`);

            ws.onopen = () => {
              // Reset attempts on success
              reconnectAttemptsRef.current.set(tabId, 0);
              // Send size immediately after connection
              const size = fitAddon.proposeDimensions() || dims;
              try { ws.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows })); } catch {}
            };

            const detectPrompt = (text: string) => {
              // Detect a PS1 '$ ' prompt, allow CR/LF variations
              return /[\r\n]\$\s$/.test(text) || /\n\$\s/.test(text) || /\r\$\s/.test(text) || text.trimEnd().endsWith('$');
            };

            ws.onmessage = (event) => {
              const data = typeof event.data === 'string' ? event.data : '';
              const current = tabs.find(t => t.id === tabId);
              const booting = current?.isBootstrapping;
              if (booting) {
                // Accumulate until we see a prompt, then finish bootstrap
                const buf = (current?.bootBuffer || '') + data;
                // Update buffer in state
                setTabs(prev => prev.map(t => t.id === tabId ? { ...t, bootBuffer: buf } : t));
                if (detectPrompt(buf)) {
                  // Finish bootstrapping: clear terminal and ask shell to print a fresh prompt
                  term.clear();
                  try { ws.send('\n'); } catch {}
                  const bootTimer = current?.bootTimer;
                  if (bootTimer) {
                    try { clearTimeout(bootTimer); } catch {}
                  }
                  setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isBootstrapping: false, bootBuffer: '', bootTimer: null } : t));
                }
                return;
              }
              term.write(data);
              term.scrollToBottom();
            };

            ws.onclose = (event) => {
              const codeMeaning: Record<number, string> = {
                1000: 'Normal closure',
                4001: 'Missing access token',
                4002: 'Invalid access token'
              };
              const meaning = codeMeaning[event.code] || 'Disconnected';
              term.writeln(`\r\n🖧 ${meaning}. Reconnecting if possible...`);

              // Mark ws as null in state so effects can try to reopen
              setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ws: null } : t));

              const currentToken = session?.access_token;
              if (event.code !== 1000 && currentToken) {
                const prevAttempts = reconnectAttemptsRef.current.get(tabId) || 0;
                const nextAttempts = Math.min(prevAttempts + 1, 5);
                reconnectAttemptsRef.current.set(tabId, nextAttempts);
                const delay = Math.min(30000, 2000 * Math.pow(2, nextAttempts - 1));
                // Clear any existing timer then schedule
                const existing = reconnectTimersRef.current.get(tabId);
                if (existing) clearTimeout(existing);
                const timer = setTimeout(() => {
                  void openWebSocket();
                }, delay);
                reconnectTimersRef.current.set(tabId, timer);
              }
            };

            // Wire onData to current ws; dispose previous handler if any
            setTabs(prev => prev.map(t => {
              if (t.id !== tabId) return t;
              try { t.onDataDispose?.dispose(); } catch {}
              const disposable = term.onData((data) => {
                if (ws.readyState === 1) {
                  ws.send(data);
                  term.scrollToBottom();
                }
              });
              // Start a bootstrap timeout fail-safe (show terminal after a delay even if no prompt detected)
              const timer = setTimeout(() => {
                setTabs(prev2 => prev2.map(tt => tt.id === tabId ? { ...tt, isBootstrapping: false, bootBuffer: '' } : tt));
              }, 5000);
              return { ...t, ws, onDataDispose: disposable, isBootstrapping: true, bootBuffer: '', bootTimer: timer };
            }));
          };

          void openWebSocket();

          // Update tab state
          setTabs(prev => prev.map(t => t.id === tabId ? { 
            ...t, 
            xterm: term, 
            fit: fitAddon, 
            // ws will be set by openWebSocket above
            isAttached: true
          } : t));
          
          setIsInitializing(false);
        } catch (error) {
          console.error('Error initializing terminal:', error);
          setIsInitializing(false);
        }
      });

    } catch (error) {
      console.error('Error creating terminal:', error);
      setIsInitializing(false);
    }
  }, [session?.access_token, tabs, isInitializing]);

  // Removed auto-reopen effect that could race with initial attach and create duplicate connections

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (tab) {
        if (tab.bootTimer) {
          try { clearTimeout(tab.bootTimer); } catch {}
        }
        const timer = reconnectTimersRef.current.get(tabId);
        if (timer) {
          clearTimeout(timer);
          reconnectTimersRef.current.delete(tabId);
        }
        reconnectAttemptsRef.current.delete(tabId);
        try { tab.ws?.close(); } catch (_) {}
        try { tab.xterm?.dispose(); } catch (_) {}
        try { tab.resizeObserver?.disconnect(); } catch (_) {}
      }
      const next = prev.filter(t => t.id !== tabId);
      if (activeId === tabId) {
        const newActiveId = next.length ? next[next.length - 1].id : null;
        setActiveId(newActiveId);
        // Log websocket status after closing tab
        setTimeout(() => {
          logWebSocketStatus(next, newActiveId);
        }, 0);
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
            // Only resize if needed - don't refresh the display content
            activeTab.fit?.fit();
            // Send updated size to backend only if dimensions changed
            if (activeTab.ws && activeTab.ws.readyState === 1 && activeTab.fit) {
              const dims = activeTab.fit.proposeDimensions() || { cols: 80, rows: 24 };
              activeTab.ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
            }
          } catch (e) {
            console.error('[Terminal] Error resizing terminal:', e);
          }
        }, 50);
      }
    }
  }, [activeId, tabs]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Use a ref to get the current tabs at unmount time
      setTabs(currentTabs => {
        currentTabs.forEach(t => {
          const timer = reconnectTimersRef.current.get(t.id);
          if (timer) {
            clearTimeout(timer);
            reconnectTimersRef.current.delete(t.id);
          }
          reconnectAttemptsRef.current.delete(t.id);
          try { t.ws?.close(); } catch (_) {}
          try { t.xterm?.dispose(); } catch (_) {}
          try { t.resizeObserver?.disconnect(); } catch (_) {}
        });
        return currentTabs; // Don't actually change state, just use it for cleanup
      });
    };
  }, []); // Empty dependency array - only run on mount/unmount

  return (
    <div style={{ backgroundColor: 'rgb(0, 0, 0)', paddingTop: '2px', width: '100%', height: 400 }}>
      {/* Tabs header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderBottom: '1px solid #222', backgroundColor: '#000' }}>
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <div key={tab.id} onClick={() => switchToTab(tab.id)} style={{
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
          <div key={tab.id} style={{ display: activeId === tab.id ? 'block' : 'none', width: '100%', height: '100%', position: 'relative' }}>
            <div 
              ref={(node) => {
                // Only attach xterm if it hasn't been attached yet and node exists
                if (!tab.isAttached && node) {
                  attachXterm(tab.id, node);
                }
              }} 
              style={{ width: '100%', height: '100%', paddingBottom: '20px' }} 
            />
            {tab.isBootstrapping && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-gray-200" style={{ pointerEvents: 'none', zIndex: 10 }}>
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                  <span>Preparing terminal…</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal; 
