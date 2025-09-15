import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
// WebSocket terminal removed; WebContainer handles terminal in-browser
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { UserWorkspaceManager } from './services/UserWorkspaceManager.js';
import { fileSystemIndexer } from './services/FileSystemIndexer.js';
// Local dev servers now run on user machines; remove server-side proxying

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
import nodejsRoutes from './routes/nodejs.js';
import javaRoutes from './routes/java.js';
import filesRoutes from './routes/files.js';
import filesRoutesV2 from './routes/files-v2.js';
import syncRoutes from './routes/sync.js';
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
console.log(`   WEBCONTAINER_API: ${process.env.WEBCONTAINER_API ? '✅ Loaded' : '❌ Missing'}`);

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
  // No special preview exceptions needed with local dev servers
  skip: () => false
});

app.use(limiter);

// Stripe webhook needs the raw body for signature verification
// Mount this BEFORE the JSON/body parsers. Use */* to handle any charset variations.
app.use('/api/stripe/webhook', express.raw({ type: '*/*' }));

// Body parsing middleware (skip Stripe webhook to preserve raw body)
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' });

app.use((req, res, next) => {
  // Skip JSON parsing for any Stripe webhook path variant (with optional trailing slash or query)
  if (req.originalUrl && req.originalUrl.startsWith('/api/stripe/webhook')) return next();
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  // Skip urlencoded parsing for any Stripe webhook path variant
  if (req.originalUrl && req.originalUrl.startsWith('/api/stripe/webhook')) return next();
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
    
    if (geminiService && geminiService.isServiceAvailable()) {
      console.log('✅ Gemini AI service initialized successfully');
    } else if (geminiService && geminiService.quotaExceeded) {
      console.log('⚠️ Gemini AI service initialized but quota exceeded - some features will be limited');
    } else {
      console.log('⚠️ Gemini AI service initialized but not fully available');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI service:', error.message);
    console.error('💡 Make sure your .env file contains a valid GEMINI_API_KEY');
    // Don't exit the process, just continue without Gemini
    geminiService = null;
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
app.use('/api/stripe', stripeRoutes); // Stripe routes (no auth required for webhooks)
app.use('/api/admin', authenticateUser, adminRoutes);
app.use('/api/search', authenticateUser, searchRoutes);
app.use('/api/sync', authenticateUser, syncRoutes);
// --- End authentication enforcement ---

// Simple health check endpoint for Fly.io deployment (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Lightweight status check for WebContainer Cloud integration
app.get('/api/webcontainer/status', authenticateUser, (req, res) => {
  const enabled = !!process.env.WEBCONTAINER_API;
  res.json({ enabled });
});

// WebContainer Cloud callback endpoints (public, used by external redirect)
// These routes intentionally do not require auth so the external service can call them.
app.get('/webcontainer/callback', (req, res) => {
  const { projectId, project, token, status, error, state } = req.query || {};
  const ok = (status || '').toString().toLowerCase() !== 'error' && !error;
  const safe = (v) => (v ? String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WebContainer Project ${ok ? 'Connected' : 'Error'}</title>
    <style>
      body{font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0b1020; color:#e6e8ec; margin:0;}
      .wrap{max-width:720px; margin:12vh auto; padding:24px; background:#121731; border-radius:12px; border:1px solid #263159; box-shadow:0 10px 30px rgba(0,0,0,0.3)}
      h1{margin:0 0 12px; font-size:22px}
      p{margin:6px 0; opacity:0.9}
      code{background:#0b1228; padding:2px 6px; border-radius:6px; border:1px solid #1f2a4d}
      .ok{color:#8ff0a4}
      .err{color:#ff9aa2}
      .hint{opacity:0.75; font-size:14px; margin-top:12px}
      .btn{display:inline-block; margin-top:16px; padding:8px 12px; background:#1f2a4d; border:1px solid #2b3a6d; border-radius:8px; color:#dfe6ff; text-decoration:none}
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>${ok ? '✅ WebContainer Project Connected' : '⚠️ WebContainer Connection Error'}</h1>
      <p>Status: <strong class="${ok ? 'ok' : 'err'}">${ok ? 'success' : 'error'}</strong></p>
      ${projectId || project ? `<p>Project: <code>${safe(projectId || project)}</code></p>` : ''}
      ${state ? `<p>State: <code>${safe(state)}</code></p>` : ''}
      ${error ? `<p class="err">Error: <code>${safe(error)}</code></p>` : ''}
      <p class="hint">You can close this tab and return to the IDE.</p>
      <a class="btn" href="/">Back to backend root</a>
    </div>
    <script>
      try {
        const payload = {
          type: 'webcontainer:connected',
          ok: ${ok ? 'true' : 'false'},
          projectId: ${JSON.stringify(projectId || project || '')},
          token: ${JSON.stringify(token || '')},
          state: ${JSON.stringify(state || '')},
          error: ${JSON.stringify(error || '')}
        };
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, '*');
        }
      } catch (e) { /* noop */ }
      setTimeout(() => { try { window.close(); } catch (_) {} }, 1500);
    </script>
  </body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(ok ? 200 : 400).send(html);
});

// Friendly landing if an external service directs users to a generic connect URL
app.get('/webcontainer/connect', (req, res) => {
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect WebContainer Project</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1020;color:#e6e8ec;margin:0} .wrap{max-width:720px;margin:12vh auto;padding:24px;background:#121731;border-radius:12px;border:1px solid #263159;box-shadow:0 10px 30px rgba(0,0,0,0.3)} h1{margin:0 0 12px;font-size:22px} p{margin:6px 0;opacity:.9} .hint{opacity:.75;font-size:14px;margin-top:12px}</style>
</head><body>
<div class="wrap">
  <h1>Connect WebContainer Project</h1>
  <p>This backend is ready to receive the connection callback at <code>/webcontainer/callback</code>.</p>
  <p class="hint">If you reached this page from a “Connect project” button, the external provider may need the callback URL set to: <code>https://cafecode-backend-v2.fly.dev/webcontainer/callback</code>.</p>
</div>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

// Generic catch-all for other WebContainer-related paths to avoid 404s
app.get('/webcontainer/*', (req, res) => {
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>WebContainer Endpoint</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0b1020;color:#e6e8ec;margin:0} .wrap{max-width:720px;margin:12vh auto;padding:24px;background:#121731;border-radius:12px;border:1px solid #263159;box-shadow:0 10px 30px rgba(0,0,0,0.3)} h1{margin:0 0 12px;font-size:22px} p{margin:6px 0;opacity:.9} code{background:#0b1228;padding:2px 6px;border-radius:6px;border:1px solid #1f2a4d}</style>
</head><body>
<div class="wrap">
  <h1>WebContainer Endpoint</h1>
  <p>Received request at <code>${req.originalUrl}</code>.</p>
  <p>This backend serves the WebContainer callback at <code>/webcontainer/callback</code>.</p>
</div>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

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
      search_grounded: '/api/search/grounded'
    }
  });
});


// Local dev health indicator for frontend feature toggles
app.get('/api/health/local-dev', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Local dev server detection enabled',
    timestamp: new Date().toISOString()
  });
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
      console.log(`🤖 Gemini AI: ${geminiService ? '✅ Connected' : '❌ Disconnected'}`);
      console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // Store server reference for graceful shutdown
    global.server = server;


    // WebSocket terminal/file-events removed; frontend uses in-browser WebContainer + polling FS sync
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
