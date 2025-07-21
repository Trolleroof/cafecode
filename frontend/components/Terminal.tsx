'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import 'xterm/css/xterm.css';
import { supabase } from '../lib/supabase';

const WS_BASE_URL = 'ws://localhost:8000/terminal';

const Terminal: React.FC = () => {
  const xtermRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputBuffer = useRef('');

  useEffect(() => {
    const instanceId = Math.random().toString(36).substring(2, 10);
    console.log(`[IDE Terminal] Terminal instance created: ${instanceId} at ${new Date().toISOString()}`);
    const term = new XTerm();
    const fitAddon = new FitAddon();
    const clipboardAddon = new ClipboardAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(clipboardAddon);
    termRef.current = term;
    fitAddonRef.current = fitAddon;
    term.open(xtermRef.current!);
    fitAddon.fit();

    let ws: WebSocket | null = null;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        term.writeln('🛑 Not authenticated. Please log in.');
        return;
      }
      const wsUrl = `${WS_BASE_URL}?access_token=${session.access_token}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        term.writeln('🖧 WebSocket connected!');
        // Send initial size
        if (fitAddonRef.current) {
          const { cols, rows } = fitAddonRef.current.proposeDimensions() || { cols: 80, rows: 24 };
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      };
      ws.onmessage = (event) => term.write(event.data);
      ws.onclose = () => term.writeln('\r\n🖧 WebSocket disconnected.');

      // Send all data from the frontend terminal to the backend shell
      term.onData((data) => {
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(data);
        }
      });
    })();

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && termRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = fitAddonRef.current.proposeDimensions() || { cols: 80, rows: 24 };
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (ws) ws.close();
      setTimeout(() => {
        term.dispose();
      }, 0);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={xtermRef} style={{ width: '100%', height: 400 }} />;
};

export default Terminal; 