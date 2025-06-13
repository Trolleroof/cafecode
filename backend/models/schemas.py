from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from enum import Enum

class ProgrammingLanguage(str, Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    JAVA = "java"
    CPP = "cpp"
    C = "c"
    HTML = "html"
    CSS = "css"
    TYPESCRIPT = "typescript"

class ErrorType(str, Enum):
    SYNTAX = "syntax"
    RUNTIME = "runtime"
    LOGIC = "logic"
    PERFORMANCE = "performance"
    STYLE = "style"

class CodeAnalysisRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=10000, description="The code to analyze")
    language: ProgrammingLanguage = Field(..., description="Programming language of the code")
    error_message: Optional[str] = Field(None, max_length=1000, description="Optional error message if available")
    context: Optional[str] = Field(None, max_length=500, description="Additional context about the code")
    
    @validator('code')
    def validate_code(cls, v):
        if not v.strip():
            raise ValueError('Code cannot be empty or only whitespace')
        return v.strip()

class CodeFixRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=10000, description="The code to fix")
    language: ProgrammingLanguage = Field(..., description="Programming language of the code")
    error_message: str = Field(..., min_length=1, max_length=1000, description="The error message to fix")
    line_number: Optional[int] = Field(None, ge=1, description="Line number where the error occurs")
    
    @validator('code')
    def validate_code(cls, v):
        if not v.strip():
            raise ValueError('Code cannot be empty or only whitespace')
        return v.strip()
    
    @validator('error_message')
    def validate_error_message(cls, v):
        if not v.strip():
            raise ValueError('Error message cannot be empty or only whitespace')
        return v.strip()

class ErrorDetail(BaseModel):
    type: ErrorType
    line_number: Optional[int] = None
    column_number: Optional[int] = None
    message: str
    severity: str = Field(..., regex="^(low|medium|high|critical)$")
    suggestion: str

class CodeAnalysisResponse(BaseModel):
    success: bool
    errors: List[ErrorDetail]
    warnings: List[ErrorDetail]
    suggestions: List[str]
    code_quality_score: int = Field(..., ge=0, le=100)
    analysis_summary: str
    execution_time: float

class FixedCodeLine(BaseModel):
    line_number: int
    original_code: str
    fixed_code: str
    explanation: str

class CodeFixResponse(BaseModel):
    success: bool
    fixed_code: str
    fixes_applied: List[FixedCodeLine]
    explanation: str
    confidence_score: int = Field(..., ge=0, le=100)
    execution_time: float

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: str
    details: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    gemini_api_status: str