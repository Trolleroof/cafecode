import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Initialize Gemini AI service
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

// Routes
app.use('/api/code', codeRoutes);
app.use('/api/python', pythonRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/hint', hintRoutes);
app.use('/api/guided', guidedRoutes);
app.use('/api/leetcode', leetcodeRoutes);
app.use('/api/tavus', tavusRoutes);

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

// Start server
let server = null; // Declare server variable in global scope

async function startServer() {
  try {
    await initializeServices();
    
    server = app.listen(PORT, '0.0.0.0', () => {
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
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('👋 HTTP server closed');
      
      // Close any remaining connections
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    console.log('👋 Process terminated');
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();