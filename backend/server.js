import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import { UserTerminalManager } from './services/UserTerminalManager.js';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { UserWorkspaceManager } from './services/UserWorkspaceManager.js';
import { fileSystemIndexer } from './services/FileSystemIndexer.js';

// Load environment variables FIRST (ensure we load backend/.env regardless of cwd)
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import routes
import codeRoutes from './routes/code.js';
import { initializeGemini } from './services/gemini.js';
import pythonRoutes from './routes/python.js';
import translateRoutes from './routes/translate.js';
import hintRoutes from './routes/hint.js';
import guidedRecapRoutes from './routes/guided_recap.js';
import guidedRoutes from './routes/guided.js';
import accountRoutes from './routes/account.js';
import tavusRoutes from './routes/tavus.js';
import nodejsRoutes from './routes/nodejs.js';
import javaRoutes from './routes/java.js';
import filesRoutes from './routes/files.js';
import filesRoutesV2 from './routes/files-v2.js';
import stripeRoutes from './routes/stripe.js';
import adminRoutes from './routes/admin.js';
import searchRoutes from './routes/search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Verify environment variables are loaded
console.log('🔧 Environment Variables Status:');
console.log(`   PORT: ${PORT}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   SUPABASE_JWT_SECRET: ${process.env.SUPABASE_JWT_SECRET ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   SUPABASE_JWT_SECRET length: ${process.env.SUPABASE_JWT_SECRET?.length || 'N/A'}`);
console.log(`   ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'Using defaults'}`);

// Trust proxy configuration
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Response compression for large JSON payloads (e.g., directory scans)
app.use(compression({
  level: 6,
  threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
}));

// CORS configuration (must run before rate limiting)
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://v2-bolt-hackathon.vercel.app',
  'https://trycafecode.xyz',
  'https://www.trycafecode.xyz',
  'https://v2-bolt-hackathon.onrender.com',
  'https://cafecode-backend-v2.fly.dev'
];
const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : null;
const allowedOrigins = envAllowedOrigins || defaultAllowedOrigins;
console.log('🌐 Allowed CORS origins:', allowedOrigins);

// Domain pattern allowances (in addition to exact list above)
const isOriginAllowedByPattern = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    // Enforce http/https only
    if (protocol !== 'http:' && protocol !== 'https:') return false;

    const isLocalhost = hostname === 'localhost';
    const isTryCafeCode = hostname === 'trycafecode.xyz' || hostname.endsWith('.trycafecode.xyz');
    const isVercel = hostname.endsWith('.vercel.app');
    const isRender = hostname.endsWith('.onrender.com');
    const isFlyApp = hostname.endsWith('.fly.dev') || hostname.endsWith('.fly.dev:443');

    return isLocalhost || isTryCafeCode || isVercel || isRender || isFlyApp;
  } catch (_) {
    return false;
  }
};

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, SSR fetches)
    if (!origin) return callback(null, true);

    const isAllowedExact = allowedOrigins.includes(origin);
    const isAllowedPattern = isOriginAllowedByPattern(origin);

    if (isAllowedExact || isAllowedPattern) {
      return callback(null, true);
    }

    // Log denied origin to help debugging
    try {
      const { hostname } = new URL(origin);
      console.warn(`🚫 CORS blocked origin: ${origin} (hostname: ${hostname})`);
    } catch (_) {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
    }
    const err = new Error('Not allowed by CORS');
    err.statusCode = 403;
    err.code = 'CORS_NOT_ALLOWED';
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
// Explicitly handle preflight across all routes with same options
app.options('*', cors(corsOptions));

// Rate limiting (after CORS so preflight is not limited)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    error_code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stripe webhook needs the raw body for signature verification
// Mount this BEFORE the JSON/body parsers
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware (skip Stripe webhook to preserve raw body)
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' });

app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') return next();
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') return next();
  urlencodedParser(req, res, next);
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

let geminiService = null;

async function initializeServices() {
  try {
    console.log('🤖 Initializing Gemini AI service...');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set. Please check your .env file.');
    }
    
    geminiService = await initializeGemini(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI service:', error.message);
    console.error('💡 Make sure your .env file contains a valid GEMINI_API_KEY');
    process.exit(1);
  }
}

// Make gemini service available to routes
app.use((req, res, next) => {
  req.geminiService = geminiService;
  next();
});

// Supabase JWT Authentication Middleware
const authenticateUser = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Auth Error: Missing or invalid authorization header format');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix    
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
   
    
    // Set user info in request
    req.user = {
      id: payload.sub, // Supabase user ID
      email: payload.email,
      role: payload.role
    };
    
    // Add Supabase client to request
    req.supabase = supabase;
    
    next();
  } catch (err) {
    console.error('❌ Authentication error:', err.name, '-', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', details: 'Please log in again' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', details: err.message });
    } else {
      return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
    }
  }
};

// Middleware to ensure user workspace exists
app.use((req, res, next) => {
  if (req.user && req.user.id) {
    UserWorkspaceManager.getUserWorkspacePath(req.user.id);
  }
  next();
});

// --- Apply authentication to all sensitive API routes ---
// All routes below require a valid Supabase JWT token
app.use('/api/files', authenticateUser, filesRoutes);
app.use('/api/v2', authenticateUser, filesRoutesV2);
app.use('/api/code', authenticateUser, codeRoutes);
app.use('/api/python', authenticateUser, pythonRoutes);
app.use('/api/nodejs', authenticateUser, nodejsRoutes);
app.use('/api/guided', authenticateUser, guidedRoutes);
app.use('/api/account', authenticateUser, accountRoutes);
app.use('/api/recap', authenticateUser, guidedRecapRoutes);
app.use('/api/hint', authenticateUser, hintRoutes);
app.use('/api/translate', authenticateUser, translateRoutes);
app.use('/api/tavus', authenticateUser, tavusRoutes);
app.use('/api/stripe', stripeRoutes); // Stripe routes (no auth required for webhooks)
app.use('/api/admin', authenticateUser, adminRoutes);
app.use('/api/search', authenticateUser, searchRoutes);
// --- End authentication enforcement ---

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CodeCraft IDE Backend',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    gemini_status: geminiService ? 'connected' : 'disconnected',
    endpoints: {
      health: '/health',
      analyze: '/api/code/analyze',
      fix: '/api/code/fix',
      docs: '/api/code/docs',
      guided: '/api/guided',
      guided_setup: '/api/guided/setup/start',
      guided_setup_chat: '/api/guided/setup/chat',
      guided_steps_generate: '/api/guided/steps/generate',
      guided_steps_cleanup: '/api/guided/steps/cleanup',
      guided_analyze_step: '/api/guided/analyzeStep',
      guided_start_project: '/api/guided/startProject',
      guided_simple_chat: '/api/guided/simple-chat',
      guided_followup: '/api/guided/followup',
      tavus: '/api/tavus',
      search_grounded: '/api/search/grounded'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const geminiStatus = geminiService ? await geminiService.checkHealth() : false;
    // Lazy import to avoid circular dependency
    const { Cache } = await import('./services/Cache.js');
    const cacheStats = await Cache.getStats();
    
    res.json({
      status: geminiStatus ? 'healthy' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        gemini_ai: geminiStatus ? 'connected' : 'disconnected',
        database: 'not_applicable',
        cache: 'enabled'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      api_key_status: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      cache: cacheStats,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    error_code: 'NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    error: error.message || 'Internal server error',
    error_code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details || null;
  }

  res.status(statusCode).json(errorResponse);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  global.server.close(() => {
    console.log('👋 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  global.server.close(() => {
    console.log('👋 Process terminated');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 CodeCraft IDE Backend Server Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 Gemini AI: ${geminiService ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // Store server reference for graceful shutdown
    global.server = server;

    // --- Unified WebSocket Server with Path-Based Routing ---
    const wss = new WebSocketServer({ server });
    
    console.log('🔧 [WEBSOCKET] Unified WebSocket server initialized');

    // Store connected clients by user ID for file events
    const fileEventClients = new Map(); // userId -> Set of WebSocket connections

    wss.on('connection', (ws, req) => {
      console.log('📡 [WEBSOCKET] New connection attempt to:', req.url, 'from:', req.socket.remoteAddress);
      
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;
      const token = url.searchParams.get('access_token');
      
      if (!token) {
        console.log('❌ [WEBSOCKET] Missing access token');
        ws.close(4001, 'Missing access token');
        return;
      }

      // Verify JWT and extract user ID
      let userId;
      try {
        const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        userId = payload.sub; // Supabase user ID is in 'sub'
        console.log('✅ [WEBSOCKET] Token verified for user:', userId);
      } catch (err) {
        console.log('❌ [WEBSOCKET] Invalid access token:', err.message);
        ws.close(4002, 'Invalid access token');
        return;
      }

      // Route based on pathname
      if (pathname === '/terminal') {
        console.log('📡 [TERMINAL] Handling terminal connection for user:', userId);
        handleTerminalConnection(ws, req, userId, url, wss);
      } else if (pathname === '/file-events') {
        console.log('📡 [FILE-EVENTS] Handling file-events connection for user:', userId);
        handleFileEventsConnection(ws, req, userId, fileEventClients);
      } else {
        console.log('❌ [WEBSOCKET] Unknown path:', pathname);
        ws.close(4004, 'Unknown endpoint');
      }
    });

    // Terminal connection handler
    function handleTerminalConnection(ws, req, userId, url, wss) {
      const requestedTerminalId = url.searchParams.get('terminal_id') || undefined;
      
      // Start or attach to terminal for this user
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const { id: terminalId, pty: ptyProcess } = UserTerminalManager.startTerminal(userId, shell, 80, 34, requestedTerminalId);

      // Store metadata on websocket
      ws.userId = userId;
      ws.terminalId = terminalId;
      ws.connectionType = 'terminal';

      // Wire up PTY <-> WebSocket
      ptyProcess.on('data', (data) => {
        try { ws.send(data); } catch (_) {}
      });
      ws.on('message', (msg) => {
        try {
          // Try to parse as JSON for resize events or other commands
          const parsed = JSON.parse(msg);
          if (parsed && parsed.type === 'resize' && parsed.cols && parsed.rows) {
            ptyProcess.resize(parsed.cols, parsed.rows);
            return;
          }
        } catch (e) {
          // Not JSON, treat as normal input
        }
        // Intercept and block cd commands that escape the workspace
        const strMsg = typeof msg === 'string' ? msg : msg.toString();
        const cdMatch = strMsg.match(/^\s*cd\s+(.+)/);
        if (cdMatch) {
          const target = cdMatch[1].trim();
          // Disallow cd to absolute paths or ..
          if (target.startsWith('/') || target.startsWith('..') || target.includes('..')) {
            try { ws.send('cd: Permission denied\r\n'); } catch (_) {}
            return;
          }
        }
        try { ptyProcess.write(msg); } catch (_) {}
      });
      ws.on('close', () => {
        // Only kill terminal if no other client is attached to the same terminal
        const stillAttached = Array.from(wss.clients).some((client) => {
          return client !== ws && client.readyState === 1 && client.userId === userId && client.terminalId === terminalId;
        });
        if (!stillAttached) {
          UserTerminalManager.killTerminal(userId, terminalId);
        }
      });
    }

    // File events connection handler
    function handleFileEventsConnection(ws, req, userId, fileEventClients) {
      // Add client to user's connection set
      if (!fileEventClients.has(userId)) {
        fileEventClients.set(userId, new Set());
      }
      fileEventClients.get(userId).add(ws);

      // Store metadata on websocket
      ws.userId = userId;
      ws.connectionType = 'file-events';

      console.log(`📡 [FILE-EVENTS] Client connected for user: ${userId}`);

      // Send initial file system state
      try {
        // Don't build file system index on every connection - this causes spam
        // Just send a simple connection confirmation
        ws.send(JSON.stringify({
          type: 'connected',
          data: { message: 'File events WebSocket connected successfully' }
        }));
        
        // Don't send initial state - let the frontend request it when needed
        // This prevents unnecessary file system indexing on every connection
      } catch (error) {
        console.warn(`[FILE-EVENTS] Could not send connection confirmation for user ${userId}:`, error.message);
      }

      ws.on('close', () => {
        // Remove client from user's connection set
        const userClients = fileEventClients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            fileEventClients.delete(userId);
          }
        }
        console.log(`📡 [FILE-EVENTS] Client disconnected for user: ${userId}`);
      });

      ws.on('error', (error) => {
        console.error(`📡 [FILE-EVENTS] WebSocket error for user ${userId}:`, error);
      });
    }

    // 5. Integrate with FileSystemIndexer to broadcast changes
    // Override the setupWatcher method to broadcast events
    const originalSetupWatcher = fileSystemIndexer.setupWatcher.bind(fileSystemIndexer);
    fileSystemIndexer.setupWatcher = function(userId, workspacePath) {
      // Call original method
      originalSetupWatcher(userId, workspacePath);
      
      // Get the watcher and enhance it to broadcast events
      const watcher = this.watchers.get(userId);
      if (watcher) {
        const originalOn = watcher.on;
        watcher.on = function(event, filename) {
          if (event === 'change' && filename && !filename.startsWith('.') && !filename.startsWith('_')) {
            // Broadcast file change to all connected clients for this user
            const userClients = fileEventClients.get(userId);
            if (userClients) {
              const eventData = {
                type: 'file_changed',
                data: {
                  path: filename,
                  timestamp: new Date().toISOString()
                }
              };
              
              userClients.forEach(client => {
                if (client.readyState === 1) { // WebSocket.OPEN
                  try {
                    client.send(JSON.stringify(eventData));
                  } catch (error) {
                    console.warn(`[FILE-EVENTS] Failed to send to client:`, error.message);
                  }
                }
              });
            }
          }
          
          // Call original event handler
          if (originalOn) {
            originalOn.call(this, event, filename);
          }
        };
      }
    };

    // Set up the file change callback to broadcast events via WebSocket
    fileSystemIndexer.setFileChangeCallback((userId, changeEvent) => {
      const userClients = fileEventClients.get(userId);
      if (userClients) {
        // Map the change type to the format expected by frontend
        let eventType;
        switch (changeEvent.type) {
          case 'created':
            eventType = 'file:created';
            break;
          case 'modified':
            eventType = 'file:updated';
            break;
          case 'deleted':
            eventType = 'file:deleted';
            break;
          default:
            eventType = 'file:updated';
        }
        
        const eventData = {
          type: eventType,
          path: changeEvent.path,
          filename: changeEvent.filename,
          isFolder: changeEvent.isDirectory,
          isDirectory: changeEvent.isDirectory,
          size: changeEvent.size,
          timestamp: changeEvent.timestamp
        };
        
        userClients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            try {
              client.send(JSON.stringify(eventData));
              // Reduced logging to prevent spam - only log errors
            } catch (error) {
              console.warn(`[FILE-EVENTS] Failed to send to client:`, error.message);
            }
          }
        });
      }
    });
    // --- End WebSocket File Events Integration ---
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
