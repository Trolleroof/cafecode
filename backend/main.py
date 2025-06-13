#!/usr/bin/env python3
"""
CodeCraft IDE Backend Server
A simple Python backend server for the CodeCraft IDE application.
"""

import http.server
import socketserver
import json
import urllib.parse
from datetime import datetime

class CodeCraftHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeCraft IDE - Backend Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #0d1117;
            color: #c9d1d9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        
        .terminal {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
        }
        
        .terminal-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #30363d;
        }
        
        .terminal-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .dot-red { background: #ff5f56; }
        .dot-yellow { background: #ffbd2e; }
        .dot-green { background: #27ca3f; }
        
        .terminal-title {
            margin-left: 1rem;
            color: #8b949e;
            font-size: 0.9rem;
        }
        
        .output {
            font-size: 0.95rem;
            line-height: 1.6;
        }
        
        .prompt {
            color: #7c3aed;
            font-weight: bold;
        }
        
        .success {
            color: #3fb950;
        }
        
        .info {
            color: #58a6ff;
        }
        
        .timestamp {
            color: #8b949e;
            font-size: 0.85rem;
        }
        
        .logo {
            color: #f85149;
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        .blink {
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="terminal">
        <div class="terminal-header">
            <div class="terminal-dot dot-red"></div>
            <div class="terminal-dot dot-yellow"></div>
            <div class="terminal-dot dot-green"></div>
            <div class="terminal-title">CodeCraft Backend Server</div>
        </div>
        
        <div class="output">
            <div><span class="prompt">$</span> python main.py</div>
            <div class="success">✓ CodeCraft IDE Backend Server Started</div>
            <div class="info">🐍 Python HTTP Server running on port 8000</div>
            <div class="timestamp">📅 """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</div>
            <br>
            <div class="logo">    ____          __      ____            ______</div>
            <div class="logo">   / __ \\____     / /___  / __ \\___  _   __/ ____/</div>
            <div class="logo">  / /_/ / __ \\   / / __ \\/ / / / _ \\| | / / __/   </div>
            <div class="logo"> / ____/ /_/ /  / / /_/ / /_/ /  __/| |/ / /___   </div>
            <div class="logo">/_/    \\____/  /_/\\____/_____/\\___/ |___/_____/   </div>
            <br>
            <div class="success">🚀 Server Status: <strong>ONLINE</strong></div>
            <div class="info">📡 Endpoints Available:</div>
            <div>   • GET  /           - This page</div>
            <div>   • GET  /api/hello  - Hello World API</div>
            <div>   • POST /api/echo   - Echo service</div>
            <br>
            <div class="prompt">server@codecraft:~$ <span class="blink">_</span></div>
        </div>
    </div>
</body>
</html>
            """
            
            self.wfile.write(html_content.encode())
            
        elif self.path == '/api/hello':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "message": "Hello World from CodeCraft IDE Backend!",
                "status": "success",
                "server": "Python HTTP Server",
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0"
            }
            
            self.wfile.write(json.dumps(response, indent=2).encode())
            
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/echo':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            try:
                data = json.loads(post_data.decode())
                response = {
                    "echo": data,
                    "message": "Data received successfully",
                    "timestamp": datetime.now().isoformat()
                }
            except json.JSONDecodeError:
                response = {
                    "error": "Invalid JSON",
                    "received": post_data.decode(),
                    "timestamp": datetime.now().isoformat()
                }
            
            self.wfile.write(json.dumps(response, indent=2).encode())
        else:
            self.send_response(404)
            self.end_headers()

def main():
    PORT = 8000
    
    print("🐍 Starting CodeCraft IDE Backend Server...")
    print(f"🚀 Server will run on http://localhost:{PORT}")
    print("📡 Available endpoints:")
    print("   • GET  /           - Main page")
    print("   • GET  /api/hello  - Hello World API")
    print("   • POST /api/echo   - Echo service")
    print("-" * 50)
    
    with socketserver.TCPServer(("", PORT), CodeCraftHandler) as httpd:
        print(f"✅ Server started successfully on port {PORT}")
        print("🔄 Press Ctrl+C to stop the server")
        print("=" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            print("👋 Goodbye!")

if __name__ == "__main__":
    main()