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
    // Create one tab on first mount
    if (tabs.length === 0) addTab();
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
      fontSize: 14,
      convertEol: true,
      cursorBlink: true,
      theme: {
        background: "#000000",
        foreground: "#ffffff",
        cursor: "#ffffff",
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
    <div style={{ backgroundColor: "rgb(0,0,0)", paddingTop: 2, width: "100%", height: '100%', overflow: 'hidden' }}>
      {/* Tabs header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderBottom: "1px solid #222", backgroundColor: "#000" }}>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {tabs.map((tab) => (
            <div key={tab.id} onClick={() => setActiveId(tab.id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", marginRight: 2,
              cursor: "pointer", borderRadius: 4,
              backgroundColor: activeId === tab.id ? "#111" : "transparent",
              borderTop: activeId === tab.id ? "2px solid #007acc" : "none",
              color: "#ddd",
            }}>
              <input
                value={tab.title}
                onChange={(e) => renameTab(tab.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ddd",
                  width: Math.max(8, tab.title.length) + "ch",
                  outline: "none",
                }}
              />
              {tabs.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} style={{ background: "transparent", border: "none", color: "#aaa", cursor: "pointer" }}>×</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addTab} title="New terminal"
          style={{ background: "transparent", color: "#ddd", border: '1px solid #333', cursor: "pointer", fontSize: 14, padding: '4px 8px', borderRadius: 4, marginLeft: 8 }}
        >+ New</button>
      </div>

      {/* Active terminal surface */}
      <div ref={containerRef} style={{ width: "100%", height: "calc(100% - 36px)", overflow: 'hidden' }}>
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: activeId === tab.id ? "block" : "none", width: "100%", height: "100%", position: "relative", overflow: 'hidden' }}>
            <div
              ref={(node) => {
                if (!tab.isAttached && node) {
                  attachXterm(tab.id, node);
                }
              }}
              onMouseDown={() => { try { tab.xterm?.focus(); } catch {} }}
              style={{ width: "100%", height: "100%" }}
            />
            {tab.isLoading && <TerminalLoader message="Starting terminal" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WebContainerTerminal;
