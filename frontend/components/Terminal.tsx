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
  // Loading animation state
  isLoading: boolean;
  hasReceivedFirstOutput: boolean;
};

const createTerminalId = () => `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// Terminal Loading Animation Component
const TerminalLoader: React.FC = () => {
  const [dots, setDots] = useState('');
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [animationTick, setAnimationTick] = useState(0);
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const spinnerInterval = setInterval(() => {
      setSpinnerIndex(prev => (prev + 1) % spinnerChars.length);
    }, 100);

    const animationInterval = setInterval(() => {
      setAnimationTick(prev => prev + 1);
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(spinnerInterval);
      clearInterval(animationInterval);
    };
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#00ff00',
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      fontSize: '14px',
      zIndex: 10,
      // Do not block clicks/typing to the terminal beneath
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <span style={{ 
          fontSize: '20px',
          color: '#00ff00'
        }}>
          {spinnerChars[spinnerIndex]}
        </span>
        <span style={{ color: '#ffffff' }}>
          Initializing terminal{dots}
        </span>
      </div>
      
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '15px'
      }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const phase = (animationTick * 0.1 + i * 0.4) % (Math.PI * 2);
          const opacity = Math.sin(phase) * 0.5 + 0.5;
          const scale = Math.sin(phase + Math.PI/4) * 0.3 + 0.7;
          return (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#00ff00',
                borderRadius: '50%',
                opacity: opacity * 0.8 + 0.2,
                transform: `scale(${scale})`,
                transition: 'all 0.1s ease'
              }}
            />
          );
        })}
      </div>
      
      <div style={{
        color: '#888',
        fontSize: '12px',
        textAlign: 'center',
        lineHeight: '1.4'
      }}>
        <div>• Establishing WebSocket connection</div>
        <div>• Setting up terminal environment</div>
        <div>• Loading shell configuration</div>
      </div>

    </div>
  );
};

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
  // Track the latest WebSocket per tab to avoid multiple onData handlers sending twice
  const wsRefs = useRef<Map<string, WebSocket | null>>(new Map());
  // Connection state guard per tab to prevent parallel opens
  const wsState = useRef<Map<string, 'connecting' | 'open' | 'closed'>>(new Map());
  // Prevent duplicate terminal initialization per tab (e.g., React StrictMode/ref re-invocations)
  const initializedTabsRef = useRef<Set<string>>(new Set());
  // Track a single input handler per tab to avoid duplicate key forwarding
  const inputHandlersRef = useRef<Map<string, { dispose: () => void } | null>>(new Map());

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
      isBootstrapping: false,
      bootBuffer: '',
      bootTimer: null,
      isLoading: true,
      hasReceivedFirstOutput: false
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
    if (!tab || !node) return;
    // Hard guard against duplicate initialization for the same tab
    if (initializedTabsRef.current.has(tabId)) return;
    if (tab.isAttached || isInitializing) return;

    // Mark as initialized immediately to avoid races
    initializedTabsRef.current.add(tabId);
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
      // Ensure the terminal is focused for immediate typing
      try { term.focus(); } catch {}
      
      // Attach a SINGLE input handler per tab that always writes to the latest WebSocket
      if (!inputHandlersRef.current.get(tabId)) {
        let lastSent = '';
        let lastSentAt = 0;
        const disposable = term.onData((data) => {
          const now = Date.now();
          const isSinglePrintable = data.length === 1 && data >= ' ' && data <= '~';
          const isImmediateDup = isSinglePrintable && data === lastSent && (now - lastSentAt) < 120;
          if (isImmediateDup) return;
          lastSent = data;
          lastSentAt = now;
          const latest = wsRefs.current.get(tabId);
          if (latest && latest.readyState === 1) {
            try { latest.send(data); } catch {}
          }
        });
        inputHandlersRef.current.set(tabId, disposable);
      }
      
      // Optimized sizing with requestAnimationFrame for smoother rendering
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
          
          const openWebSocket = async () => {
            // Prevent parallel opens for this tab
            const state = wsState.current.get(tabId);
            if (state === 'connecting' || state === 'open') {
              return;
            }
            wsState.current.set(tabId, 'connecting');
            // Avoid parallel connection attempts per tab
            const token = await getFreshAccessToken(supabase);
            if (!token) {
              wsState.current.set(tabId, 'closed');
              return;
            }

            // Ensure any previous socket for this tab is closed before opening a new one
            const existing = wsRefs.current.get(tabId);
            try { existing?.close(); } catch {}

            const ws = new WebSocket(`${WS_BASE_URL}?access_token=${encodeURIComponent(token)}&terminal_id=${tabId}`);

            ws.onopen = () => {
              // Track latest ws for this tab
              wsRefs.current.set(tabId, ws);
              wsState.current.set(tabId, 'open');
              // Reset attempts on success
              reconnectAttemptsRef.current.set(tabId, 0);
              // Send size immediately after connection
              const size = fitAddon.proposeDimensions() || dims;
              try { ws.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows })); } catch {}
              
              // Fallback: Hide loader after 5 seconds to prevent getting stuck
              setTimeout(() => {
                setTabs(prevTabs => prevTabs.map(prevTab => 
                  prevTab.id === tabId ? { ...prevTab, isLoading: false } : prevTab
                ));
              }, 5000);
            };

            // Simple, safe de-duplication guard for immediate 1-char repeats
            // This addresses rare cases where two sources echo the same keystroke.
            let lastMsg = '';
            let lastMsgAt = 0;

            ws.onmessage = (event) => {
              // Ignore messages from non-latest sockets for this tab
              const latest = wsRefs.current.get(tabId);
              if (latest && latest !== ws) return;
              const data = typeof event.data === 'string' ? event.data : '';

              // Drop only ultra-quick consecutive identical 1-char messages (likely double-echo)
              // Keep everything else, including spaces/newlines and larger chunks.
              const now = Date.now();
              const isSinglePrintable = data.length === 1 && data >= ' ' && data <= '~';
              const isImmediateDup = isSinglePrintable && data === lastMsg && (now - lastMsgAt) < 120;
              lastMsg = data;
              lastMsgAt = now;

              if (!isImmediateDup && data) {
                term.write(data);
                term.scrollToBottom();
                
                // Provide helpful feedback for common issues
                if (data.includes('No such file or directory') && data.includes('package.json')) {
                  term.write('\r\n💡 Tip: Use "auto-project" to navigate to your project directory\r\n');
                } else if (data.includes('command not found') && (data.includes('npm') || data.includes('node'))) {
                  term.write('\r\n💡 Note: Node.js commands should work in project directories\r\n');
                } else if (data.includes('ENOENT') && data.includes('package.json')) {
                  term.write('\r\n💡 Try: "find-project <project-name>" or "auto-project"\r\n');
                }
              }
              
              // Update loading state based on terminal output
              setTabs(prev => prev.map(t => {
                if (t.id !== tabId) return t;
                
                let newIsLoading = t.isLoading;
                let newHasReceivedFirstOutput = t.hasReceivedFirstOutput;
                
                // Mark that we've received first output
                if (!t.hasReceivedFirstOutput && data) {
                  newHasReceivedFirstOutput = true;
                }
                
                // Detect clear command by looking for ANSI escape sequences that clear screen
                // This is the most reliable indicator that terminal setup is complete
                const clearPatterns = [
                  /\x1b\[2J/,      // Clear entire screen
                  /\x1b\[H\x1b\[2J/, // Move cursor to home and clear screen
                  /\x1b\[3J/,      // Clear entire screen and scrollback
                  /\x1bc/          // Full reset
                ];
                
                const isClearCommand = clearPatterns.some(pattern => pattern.test(data));
                
                // Hide loading animation immediately when clear command is detected
                if (isClearCommand && t.hasReceivedFirstOutput) {
                  newIsLoading = false;
                }
                
                if (newIsLoading !== t.isLoading || newHasReceivedFirstOutput !== t.hasReceivedFirstOutput) {
                  return { ...t, isLoading: newIsLoading, hasReceivedFirstOutput: newHasReceivedFirstOutput };
                }
                return t;
              }));
            };

            ws.onclose = (event) => {
              // Clear ws ref for this tab
              wsRefs.current.set(tabId, null);
              wsState.current.set(tabId, 'closed');
              const codeMeaning: Record<number, string> = {
                1000: 'Normal closure',
                4001: 'Missing access token',
                4002: 'Invalid access token',
                4003: 'Access token expired'
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

            // Update ws in state
            setTabs(prev => prev.map(t => {
              if (t.id !== tabId) return t;
              return { ...t, ws, isBootstrapping: false, bootBuffer: '', bootTimer: null };
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
          // Allow retry by clearing init guard
          initializedTabsRef.current.delete(tabId);
          setIsInitializing(false);
        }
      });

    } catch (error) {
      console.error('Error creating terminal:', error);
      // Allow retry by clearing init guard
      initializedTabsRef.current.delete(tabId);
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
        wsRefs.current.delete(tabId);
        try { tab.ws?.close(); } catch (_) {}
        try { tab.xterm?.dispose(); } catch (_) {}
        try { tab.resizeObserver?.disconnect(); } catch (_) {}
        // Clear init guard for this tab
        initializedTabsRef.current.delete(tabId);
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
          wsRefs.current.delete(t.id);
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
              {tabs.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer' }}>×</button>
              )}
            </div>
          ))}
        </div>
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
              onMouseDown={() => { try { tab.xterm?.focus(); } catch {} }}
              style={{ width: '100%', height: '100%', paddingBottom: '20px' }} 
            />
            {/* Show loading animation while terminal is initializing */}
            {tab.isLoading && <TerminalLoader />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal; 
