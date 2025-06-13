from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager

from routers import code_helper
from services.gemini import GeminiService
from models.schemas import HealthResponse, ErrorResponse

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instance
gemini_service: GeminiService = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global gemini_service
    
    # Startup
    logger.info("Starting CodeCraft IDE Backend...")
    
    # Initialize Gemini service
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY not found in environment variables")
        raise ValueError("GEMINI_API_KEY is required")
    
    try:
        gemini_service = GeminiService(api_key)
        logger.info("Gemini AI service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini service: {str(e)}")
        raise
    
    # Check API connectivity
    try:
        api_status = await gemini_service.check_api_status()
        if api_status:
            logger.info("Gemini API connectivity verified")
        else:
            logger.warning("Gemini API connectivity check failed")
    except Exception as e:
        logger.warning(f"Could not verify Gemini API connectivity: {str(e)}")
    
    logger.info("Application startup completed")
    
    yield
    
    # Shutdown
    logger.info("Shutting down CodeCraft IDE Backend...")
    gemini_service = None
    logger.info("Application shutdown completed")

# Create FastAPI application
app = FastAPI(
    title="CodeCraft IDE Backend",
    description="AI-powered code analysis and error fixing service for CodeCraft IDE",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(code_helper.router)

# Root endpoint
@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint with service information"""
    global gemini_service
    
    try:
        gemini_status = "connected" if gemini_service else "not_initialized"
        if gemini_service:
            api_check = await gemini_service.check_api_status()
            gemini_status = "connected" if api_check else "disconnected"
    except Exception:
        gemini_status = "error"
    
    return HealthResponse(
        status="online",
        version="1.0.0",
        timestamp=str(int(__import__('time').time())),
        gemini_api_status=gemini_status
    )

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check endpoint"""
    global gemini_service
    
    try:
        gemini_status = "not_initialized"
        if gemini_service:
            api_check = await gemini_service.check_api_status()
            gemini_status = "connected" if api_check else "disconnected"
        
        return HealthResponse(
            status="healthy" if gemini_status == "connected" else "degraded",
            version="1.0.0",
            timestamp=str(int(__import__('time').time())),
            gemini_api_status=gemini_status
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            version="1.0.0",
            timestamp=str(int(__import__('time').time())),
            gemini_api_status="error"
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            error_code="GLOBAL_ERROR",
            details={"path": str(request.url), "method": request.method}
        ).dict()
    )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            error_code=f"HTTP_{exc.status_code}"
        ).dict()
    )

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    logger.info(f"Starting server on {host}:{port} (debug={debug})")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info" if debug else "warning"
    )