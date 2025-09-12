"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { ClipboardAddon } from "@xterm/addon-clipboard";
import "xterm/css/xterm.css";
import { webContainerService } from "@/services/WebContainerService";
import type { WebContainerProcess } from "@webcontainer/api";

type TerminalTab = {
  id: string;
  title: string;
  xterm: XTerm | null;
  fit: FitAddon | null;
  proc: WebContainerProcess | null;
  isAttached: boolean;
  isLoading: boolean;
};

const createTerminalId = () => `wct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const TerminalLoader: React.FC<{ message?: string }> = ({ message }) => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const i = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(i);
  }, []);
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,0,0,0.92)",
      color: "#9ae6b4",
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      zIndex: 5,
      pointerEvents: "none",
    }}>
      {(message || "Starting WebContainer") + dots}
    </div>
  );
};

const WebContainerTerminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const initializedTabsRef = useRef<Set<string>>(new Set());
  const initialTabCreatedRef = useRef<boolean>(false);

  const addTab = useCallback(() => {
    const id = createTerminalId();
    setTabs((prev) => [
      ...prev,
      {
        id,
        title: `Terminal`,
        xterm: null,
        fit: null,
        proc: null,
        isAttached: false,
        isLoading: true,
      },
    ]);
    setActiveId(id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    // Prevent closing the last tab
    if (tabs.length <= 1) return;
    
    setTabs((prev) => {
      const tab = prev.find((t) => t.id === tabId);
      if (tab) {
        try { tab.proc?.kill(); } catch {}
        try { tab.xterm?.dispose(); } catch {}
      }
      const next = prev.filter((t) => t.id !== tabId);
      if (activeId === tabId) {
        setActiveId(next.length ? next[next.length - 1].id : null);
      }
      initializedTabsRef.current.delete(tabId);
      return next;
    });
  }, [activeId, tabs.length]);

  const renameTab = useCallback((tabId: string, title: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, title } : t)));
  }, []);

  useEffect(() => {
    // Create one tab on first mount only
    if (tabs.length === 0 && !initialTabCreatedRef.current) {
      initialTabCreatedRef.current = true;
      addTab();
    }
  }, [tabs.length, addTab]);

  const attachXterm = useCallback(async (tabId: string, node: HTMLDivElement | null) => {
    if (!node) return;
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    if (tab.isAttached || initializedTabsRef.current.has(tabId)) return;

    initializedTabsRef.current.add(tabId);

    // Create terminal
    const term = new XTerm({
      cols: 80,
      rows: 24,
      fontSize: 16,
      lineHeight: 1.0,
      convertEol: true,
      cursorBlink: true,
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#58a6ff",
        black: "#484f58",
        red: "#f85149",
        green: "#3fb950",
        yellow: "#d29922",
        blue: "#58a6ff",
        magenta: "#bc8cff",
        cyan: "#39d353",
        white: "#f0f6fc",
        brightBlack: "#6e7681",
        brightRed: "#f85149",
        brightGreen: "#3fb950",
        brightYellow: "#d29922",
        brightBlue: "#58a6ff",
        brightMagenta: "#bc8cff",
        brightCyan: "#39d353",
        brightWhite: "#f0f6fc"
      },
    });

    const fitAddon = new FitAddon();
    const clipboardAddon = new ClipboardAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(clipboardAddon);
    term.open(node);
    try { term.focus(); } catch {}

    // Optimistic fit pre-boot
    try { fitAddon.fit(); } catch {}
    const dims = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };

    // Boot WebContainer + spawn shell
    try {
      await webContainerService.boot();

      // Derive username from auth (fallback to 'user') and set workspace name in PS1
      const username = (typeof window !== 'undefined' && (window as any).__CAFECODE_USERNAME__) || 'user';
      const workspaceName = `${username}-workspace`;

      const proc = await webContainerService.spawnShell({ cols: dims.cols, rows: dims.rows });

      // Pipe process output to xterm with light highlighting
      const output = proc.output;
      const writer = output.getReader();
      const colorize = (s: string) => {
        try {
          // Basic highlight for build logs
          return s
            .replace(/\b(ERROR|Failed|Exception)\b/gi, '\u001b[31m$1\u001b[0m')
            .replace(/\b(WARN|Deprecated)\b/gi, '\u001b[33m$1\u001b[0m')
            .replace(/\b(Success|built in [\d\.]+ms)\b/gi, '\u001b[32m$1\u001b[0m');
        } catch { return s; }
      };

      let canceled = false;
      (async () => {
        try {
          while (!canceled) {
            const { value, done } = await writer.read();
            if (done || value === undefined) break;
            term.write(colorize(value));
          }
        } catch {}
      })();

      // Pipe xterm input to process
      const inputWriter = proc.input.getWriter();
      const onDataDisposable = term.onData(async (data) => {
        try { await inputWriter.write(data); } catch {}
      });

      // Initial resize
      try {
        fitAddon.fit();
        const d = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
        // @ts-ignore - resize exists on TTY processes
        if (typeof proc.resize === 'function') proc.resize({ cols: d.cols, rows: d.rows });
      } catch {}

      // No custom prompt setup - use default terminal prompt

      // Finalize tab wiring
      setTabs((prev) => prev.map((t) => (t.id === tabId ? {
        ...t,
        xterm: term,
        fit: fitAddon,
        proc,
        isAttached: true,
        isLoading: false,
      } : t)));

      // Cleanup for this attachment
      const cleanup = () => {
        canceled = true;
        try { onDataDisposable.dispose(); } catch {}
        try { writer.releaseLock(); } catch {}
        try { inputWriter.releaseLock(); } catch {}
      };

      // Nothing to register on term; rely on tab close/unmount to run cleanup
    } catch (err) {
      term.writeln("\r\nFailed to start WebContainer shell.\r\n" + String(err));
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isLoading: false } : t)));
    }
  }, [tabs]);

  // Global resize handler: resize only the active terminal
  useEffect(() => {
    const onResize = () => {
      const active = tabs.find((t) => t.id === activeId);
      if (active?.fit && active?.proc) {
        try {
          active.fit.fit();
          const d = active.fit.proposeDimensions() || { cols: 80, rows: 24 };
          // @ts-ignore - resize exists on TTY processes
          if (typeof active.proc.resize === 'function') active.proc.resize({ cols: d.cols, rows: d.rows });
        } catch {}
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeId, tabs]);

  useEffect(() => {
    return () => {
      // On unmount, dispose tabs/processes
      setTabs((current) => {
        current.forEach((t) => {
          try { t.proc?.kill(); } catch {}
          try { t.xterm?.dispose(); } catch {}
        });
        return current;
      });
    };
  }, []);

  // Ensure sizing is correct when switching tabs
  useEffect(() => {
    if (!activeId) return;
    const tab = tabs.find((t) => t.id === activeId);
    if (!tab?.fit || !tab?.proc) return;
    setTimeout(() => {
      try {
        tab.fit!.fit();
        const d = tab.fit!.proposeDimensions() || { cols: 80, rows: 24 };
        // @ts-ignore
        if (typeof tab.proc!.resize === 'function') tab.proc!.resize({ cols: d.cols, rows: d.rows });
      } catch {}
    }, 50);
  }, [activeId, tabs]);

  return (
    <div style={{ 
      backgroundColor: "#0d1117", 
      width: "100%", 
      height: '100%', 
      overflow: 'hidden', 
      borderRadius: '8px', 
      border: '1px solid #30363d',
      scrollbarWidth: "none",
      msOverflowStyle: "none"
    }}>
      {/* Tabs header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        padding: "8px 12px", 
        borderBottom: "1px solid #30363d", 
        backgroundColor: "#161b22",
        borderRadius: "8px 8px 0 0"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tabs.map((tab) => (
            <div 
              key={tab.id} 
              onClick={() => setActiveId(tab.id)} 
              style={{
                display: "flex", 
                alignItems: "center", 
                gap: 6, 
                padding: "6px 12px", 
                cursor: "pointer", 
                borderRadius: 6,
                backgroundColor: activeId === tab.id ? "#238636" : "#21262d",
                border: activeId === tab.id ? "1px solid #238636" : "1px solid #30363d",
                color: activeId === tab.id ? "#ffffff" : "#e6edf3",
                transition: "all 0.2s ease",
                fontSize: "14px",
                fontWeight: "500",
                opacity: activeId === tab.id ? 1 : 0.8
              }}
              onMouseEnter={(e) => {
                if (activeId !== tab.id) {
                  e.currentTarget.style.backgroundColor = "#30363d";
                  e.currentTarget.style.opacity = "1";
                }
              }}
              onMouseLeave={(e) => {
                if (activeId !== tab.id) {
                  e.currentTarget.style.backgroundColor = "#21262d";
                  e.currentTarget.style.opacity = "0.8";
                }
              }}
            >
              <span style={{ color: "inherit" }}>
                {tab.title}
              </span>
              {tabs.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} 
                  style={{ 
                    background: "transparent", 
                    border: "none", 
                    color: activeId === tab.id ? "#e6edf3" : "#8b949e", 
                    cursor: "pointer",
                    padding: "2px",
                    borderRadius: "3px",
                    fontSize: "16px",
                    lineHeight: 1,
                    transition: "color 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#f85149"}
                  onMouseLeave={(e) => e.currentTarget.style.color = activeId === tab.id ? "#e6edf3" : "#8b949e"}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button 
          onClick={addTab} 
          title="New terminal"
          style={{ 
            background: "transparent", 
            color: "#8b949e", 
            border: '1px solid #30363d', 
            cursor: "pointer", 
            fontSize: 14, 
            padding: '8px 16px', 
            borderRadius: 6,
            transition: "all 0.2s ease",
            fontWeight: "500"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#238636";
            e.currentTarget.style.borderColor = "#238636";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#30363d";
            e.currentTarget.style.color = "#8b949e";
          }}
        >
          + New Terminal
        </button>
      </div>

      {/* Active terminal surface */}
      <div ref={containerRef} style={{ 
        width: "100%", 
        height: "calc(100% - 65px)", 
        overflow: 'hidden',
        backgroundColor: "#0d1117",
        borderRadius: "0 0 8px 8px"
      }}>
        {tabs.map((tab) => (
          <div 
            key={tab.id} 
            style={{ 
              display: activeId === tab.id ? "block" : "none", 
              width: "100%", 
              height: "100%", 
              position: "relative", 
              overflow: 'hidden',
              padding: "8px"
            }}
          >
            <div
              ref={(node) => {
                if (!tab.isAttached && node) {
                  attachXterm(tab.id, node);
                }
              }}
              onMouseDown={() => { try { tab.xterm?.focus(); } catch {} }}
              style={{ 
                width: "100%", 
                height: "100%",
                backgroundColor: "#0d1117",
                borderRadius: "6px",
                border: "1px solid #30363d",
                padding: "6px",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}
            />
            {tab.isLoading && <TerminalLoader message="Starting terminal" />}
          </div>
        ))}
      </div>
      
      {/* Hide scrollbars and reduce line spacing */}
      <style>{`
        .xterm-viewport::-webkit-scrollbar {
          display: none;
        }
        .xterm-viewport {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .xterm .xterm-rows {
          line-height: 1.0 !important;
        }
        .xterm .xterm-rows div {
          line-height: 1.0 !important;
        }
        .xterm .xterm-screen {
          line-height: 1.0 !important;
        }
      `}</style>
    </div>
  );
};

export default WebContainerTerminal;
