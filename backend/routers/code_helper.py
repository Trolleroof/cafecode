from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import logging
import time
from typing import Dict, Any

from models.schemas import (
    CodeAnalysisRequest, CodeAnalysisResponse,
    CodeFixRequest, CodeFixResponse,
    ErrorResponse
)
from services.gemini import GeminiService

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/code", tags=["Code Analysis"])

# Dependency to get Gemini service
async def get_gemini_service() -> GeminiService:
    """Dependency to get Gemini service instance"""
    from main import gemini_service
    if not gemini_service:
        raise HTTPException(
            status_code=503,
            detail="Gemini AI service is not available"
        )
    return gemini_service

@router.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(
    request: CodeAnalysisRequest,
    gemini: GeminiService = Depends(get_gemini_service)
) -> CodeAnalysisResponse:
    """
    Analyze code for errors, warnings, and improvements.
    
    This endpoint accepts code in various programming languages and provides:
    - Syntax error detection
    - Logic error identification
    - Performance suggestions
    - Code quality scoring
    - Best practice recommendations
    """
    try:
        logger.info(f"Analyzing {request.language} code ({len(request.code)} characters)")
        
        # Perform code analysis
        result = await gemini.analyze_code(request)
        
        logger.info(f"Analysis completed. Found {len(result.errors)} errors and {len(result.warnings)} warnings")
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error in code analysis: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in code analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during code analysis"
        )

@router.post("/fix", response_model=CodeFixResponse)
async def fix_code(
    request: CodeFixRequest,
    gemini: GeminiService = Depends(get_gemini_service)
) -> CodeFixResponse:
    """
    Fix code based on provided error message.
    
    This endpoint accepts code with a specific error and provides:
    - Corrected code
    - Line-by-line explanations of fixes
    - Confidence score for the fix
    - Overall explanation of changes made
    """
    try:
        logger.info(f"Fixing {request.language} code error: {request.error_message[:100]}...")
        
        # Perform code fixing
        result = await gemini.fix_code(request)
        
        logger.info(f"Fix completed. Applied {len(result.fixes_applied)} fixes with {result.confidence_score}% confidence")
        
        return result
        
    except ValueError as e:
        logger.error(f"Validation error in code fixing: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in code fixing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during code fixing"
        )

@router.get("/health")
async def health_check(
    gemini: GeminiService = Depends(get_gemini_service)
) -> Dict[str, Any]:
    """
    Check the health status of the code analysis service.
    """
    try:
        # Check Gemini API status
        gemini_status = await gemini.check_api_status()
        
        return {
            "status": "healthy" if gemini_status else "degraded",
            "gemini_api": "connected" if gemini_status else "disconnected",
            "timestamp": time.time(),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "gemini_api": "error",
            "error": str(e),
            "timestamp": time.time(),
            "version": "1.0.0"
        }

# Error handlers
@router.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            error_code=f"HTTP_{exc.status_code}"
        ).dict()
    )

@router.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            error_code="INTERNAL_ERROR",
            details={"message": str(exc)}
        ).dict()
    )