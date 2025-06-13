import google.generativeai as genai
import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Tuple
from functools import wraps
from models.schemas import (
    CodeAnalysisRequest, CodeAnalysisResponse, CodeFixRequest, 
    CodeFixResponse, ErrorDetail, FixedCodeLine, ErrorType
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def async_retry(max_retries: int = 3, delay: float = 1.0):
    """Decorator for async retry logic"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed: {str(e)}. Retrying in {delay}s...")
                        await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
                    else:
                        logger.error(f"All {max_retries} attempts failed. Last error: {str(e)}")
            raise last_exception
        return wrapper
    return decorator

class GeminiService:
    def __init__(self, api_key: str):
        """Initialize Gemini service with API key"""
        if not api_key:
            raise ValueError("Gemini API key is required")
        
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
            logger.info("Gemini AI service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini AI: {str(e)}")
            raise
    
    async def check_api_status(self) -> bool:
        """Check if Gemini API is accessible"""
        try:
            # Simple test prompt
            response = await asyncio.to_thread(
                self.model.generate_content,
                "Hello, respond with 'OK' if you're working."
            )
            return "OK" in response.text
        except Exception as e:
            logger.error(f"Gemini API health check failed: {str(e)}")
            return False
    
    def _create_analysis_prompt(self, request: CodeAnalysisRequest) -> str:
        """Create a detailed prompt for code analysis"""
        prompt = f"""
You are an expert code analyzer. Analyze the following {request.language} code and provide a comprehensive analysis.

Code to analyze:
```{request.language}
{request.code}
```

{f"Error message: {request.error_message}" if request.error_message else ""}
{f"Context: {request.context}" if request.context else ""}

Please provide your analysis in the following JSON format:
{{
    "errors": [
        {{
            "type": "syntax|runtime|logic|performance|style",
            "line_number": number or null,
            "column_number": number or null,
            "message": "detailed error description",
            "severity": "low|medium|high|critical",
            "suggestion": "how to fix this error"
        }}
    ],
    "warnings": [
        {{
            "type": "syntax|runtime|logic|performance|style",
            "line_number": number or null,
            "column_number": number or null,
            "message": "detailed warning description",
            "severity": "low|medium|high|critical",
            "suggestion": "how to improve this"
        }}
    ],
    "suggestions": [
        "general improvement suggestion 1",
        "general improvement suggestion 2"
    ],
    "code_quality_score": number_between_0_and_100,
    "analysis_summary": "overall summary of the code quality and issues found"
}}

Focus on:
1. Syntax errors and typos
2. Logic errors and potential bugs
3. Performance issues
4. Code style and best practices
5. Security vulnerabilities
6. Readability improvements

Be specific about line numbers when possible and provide actionable suggestions.
"""
        return prompt
    
    def _create_fix_prompt(self, request: CodeFixRequest) -> str:
        """Create a detailed prompt for code fixing"""
        prompt = f"""
You are an expert code fixer. Fix the following {request.language} code that has an error.

Code with error:
```{request.language}
{request.code}
```

Error message: {request.error_message}
{f"Error occurs at line: {request.line_number}" if request.line_number else ""}

Please provide your fix in the following JSON format:
{{
    "fixed_code": "complete corrected code",
    "fixes_applied": [
        {{
            "line_number": number,
            "original_code": "original line of code",
            "fixed_code": "corrected line of code",
            "explanation": "explanation of what was changed and why"
        }}
    ],
    "explanation": "overall explanation of the fixes applied",
    "confidence_score": number_between_0_and_100
}}

Requirements:
1. Fix the specific error mentioned
2. Preserve the original code structure and logic as much as possible
3. Only make necessary changes to fix the error
4. Provide clear explanations for each change
5. Ensure the fixed code follows best practices
6. Maintain proper formatting and indentation
"""
        return prompt
    
    def _parse_json_response(self, response_text: str) -> Dict:
        """Parse JSON response from Gemini, handling potential formatting issues"""
        try:
            # Try to extract JSON from markdown code blocks
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                json_text = response_text[start:end].strip()
            else:
                json_text = response_text.strip()
            
            return json.loads(json_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Response text: {response_text}")
            raise ValueError(f"Invalid JSON response from AI: {str(e)}")
    
    @async_retry(max_retries=3, delay=1.0)
    async def analyze_code(self, request: CodeAnalysisRequest) -> CodeAnalysisResponse:
        """Analyze code for errors and improvements"""
        start_time = time.time()
        
        try:
            prompt = self._create_analysis_prompt(request)
            
            # Generate response using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            if not response.text:
                raise ValueError("Empty response from Gemini AI")
            
            # Parse the JSON response
            analysis_data = self._parse_json_response(response.text)
            
            # Convert to response model
            errors = [ErrorDetail(**error) for error in analysis_data.get('errors', [])]
            warnings = [ErrorDetail(**warning) for warning in analysis_data.get('warnings', [])]
            
            execution_time = time.time() - start_time
            
            return CodeAnalysisResponse(
                success=True,
                errors=errors,
                warnings=warnings,
                suggestions=analysis_data.get('suggestions', []),
                code_quality_score=analysis_data.get('code_quality_score', 50),
                analysis_summary=analysis_data.get('analysis_summary', 'Analysis completed'),
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Code analysis failed: {str(e)}")
            
            # Return a basic error response
            return CodeAnalysisResponse(
                success=False,
                errors=[ErrorDetail(
                    type=ErrorType.RUNTIME,
                    message=f"Analysis failed: {str(e)}",
                    severity="high",
                    suggestion="Please check your code and try again"
                )],
                warnings=[],
                suggestions=[],
                code_quality_score=0,
                analysis_summary=f"Analysis failed due to error: {str(e)}",
                execution_time=execution_time
            )
    
    @async_retry(max_retries=3, delay=1.0)
    async def fix_code(self, request: CodeFixRequest) -> CodeFixResponse:
        """Fix code based on error message"""
        start_time = time.time()
        
        try:
            prompt = self._create_fix_prompt(request)
            
            # Generate response using Gemini
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            if not response.text:
                raise ValueError("Empty response from Gemini AI")
            
            # Parse the JSON response
            fix_data = self._parse_json_response(response.text)
            
            # Convert to response model
            fixes_applied = [FixedCodeLine(**fix) for fix in fix_data.get('fixes_applied', [])]
            
            execution_time = time.time() - start_time
            
            return CodeFixResponse(
                success=True,
                fixed_code=fix_data.get('fixed_code', request.code),
                fixes_applied=fixes_applied,
                explanation=fix_data.get('explanation', 'Code has been fixed'),
                confidence_score=fix_data.get('confidence_score', 80),
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Code fixing failed: {str(e)}")
            
            # Return error response
            return CodeFixResponse(
                success=False,
                fixed_code=request.code,
                fixes_applied=[],
                explanation=f"Failed to fix code: {str(e)}",
                confidence_score=0,
                execution_time=execution_time
            )