import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import { UserTerminalManager } from './services/UserTerminalManager.js';
import jwt from 'jsonwebtoken';

// Load environment variables FIRST
dotenv.config();

// Import routes
import codeRoutes from './routes/code.js';
import { initializeGemini } from './services/gemini.js';
import pythonRoutes from './routes/python.js';
import translateRoutes from './routes/translate.js';
import hintRoutes from './routes/hint.js';
import guidedRoutes from './routes/guided.js';
import leetcodeRoutes from './routes/leetcode.js';
import tavusRoutes from './routes/tavus.js';
import nodejsRoutes from './routes/nodejs.js';
import javaRoutes from './routes/java.js';
import filesRoutes from './routes/files.js';
import { UserWorkspaceManager } from './services/UserWorkspaceManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Verify environment variables are loaded
console.log('🔧 Environment Variables Status:');
console.log(`   PORT: ${PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`   ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'Using defaults'}`);

// Trust proxy configuration
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
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

// CORS configuration
const defaultAllowedOrigins = [
  'http://localhost:3000',
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

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, SSR fetches)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
// Explicitly handle preflight across all routes with same options
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    console.log('🔐 Auth Debug - Token length:', token.length);
    
    // Verify JWT token using Supabase secret
    const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    console.log('✅ Auth Success - User ID:', payload.sub);
    
    // Set user info in request
    req.user = {
      id: payload.sub, // Supabase user ID
      email: payload.email,
      role: payload.role
    };
    
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
app.use('/api/code', authenticateUser, codeRoutes);
app.use('/api/python', authenticateUser, pythonRoutes);
app.use('/api/nodejs', authenticateUser, nodejsRoutes);
app.use('/api/leetcode', authenticateUser, leetcodeRoutes);
app.use('/api/guided', authenticateUser, guidedRoutes);
app.use('/api/hint', authenticateUser, hintRoutes);
app.use('/api/translate', authenticateUser, translateRoutes);
app.use('/api/tavus', authenticateUser, tavusRoutes);
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
      leetcode: '/api/leetcode',
      tavus: '/api/tavus'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const geminiStatus = geminiService ? await geminiService.checkHealth() : false;
    
    res.json({
      status: geminiStatus ? 'healthy' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        gemini_ai: geminiStatus ? 'connected' : 'disconnected',
        database: 'not_applicable',
        cache: 'not_applicable'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      api_key_status: process.env.GEMINI_API_KEY ? 'configured' : 'missing'
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

    // --- WebSocket Terminal Integration (browser-terminal style) ---
    const wss = new WebSocketServer({ server, path: '/terminal' });

    wss.on('connection', (ws, req) => {
      // 1. Get access_token from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('access_token');
      if (!token) {
        ws.close(4001, 'Missing access token');
        return;
      }

      // 2. Verify JWT and extract user ID
      let userId;
      try {
        const payload = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
        userId = payload.sub; // Supabase user ID is in 'sub'
      } catch (err) {
        ws.close(4002, 'Invalid access token');
        return;
      }

      // 3. Start terminal for this user
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const ptyProcess = UserTerminalManager.startTerminal(userId, shell);

      // 4. Wire up PTY <-> WebSocket
      ptyProcess.on('data', (data) => ws.send(data));
      ws.on('message', (msg) => {
        try {
          // Try to parse as JSON for resize events
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
            ws.send('cd: Permission denied\r\n');
            return;
          }
        }
        ptyProcess.write(msg);
      });
      ws.on('close', () => UserTerminalManager.killTerminal(userId));
    });
    // --- End WebSocket Terminal Integration ---
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();