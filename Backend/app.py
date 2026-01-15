from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import os
import google.generativeai as genai
import logging
from enum import Enum
import json
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
class PromptCategory(str, Enum):
    CREATIVE_WRITING = "creative_writing"
    CODE_GENERATION = "code_generation"
    ACADEMIC_RESEARCH = "academic_research"
    BUSINESS_COMMUNICATION = "business_communication"
    DATA_ANALYSIS = "data_analysis"
    GENERAL = "general"

class EnhancementRequest(BaseModel):
    prompt: str
    category: Optional[PromptCategory] = None
    tone: Optional[str] = "professional"
    include_examples: bool = True
    target_length: Optional[str] = "detailed"  # brief, detailed, comprehensive
    custom_instructions: Optional[str] = None

class BatchEnhancementRequest(BaseModel):
    prompts: List[str]
    category: Optional[PromptCategory] = None

class EnhancedPromptResponse(BaseModel):
    id: str
    original_prompt: str
    enhanced_prompt: str
    category: str
    metadata: Dict
    created_at: str
    word_count: int
    token_estimate: int
    quality_score: float

# Global variables
gemini_model = None
ENHANCEMENT_PROMPTS = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global gemini_model, ENHANCEMENT_PROMPTS
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment variables")
    
    try:
        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel('gemini-pro')
        logger.info("Gemini AI model initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
    
    # Load enhancement templates
    ENHANCEMENT_PROMPTS = {
        "creative_writing": """
        Transform this into a professional creative writing prompt with:
        1. SPECIFIC GENRE & STYLE: Specify exact genre (fantasy, sci-fi, romance, mystery, etc.), tone (dark, humorous, melancholic, uplifting), and writing style
        2. CHARACTER DEVELOPMENT: Define main characters with specific traits, motivations, flaws, and arcs
        3. SETTING DETAILS: Provide vivid location, time period, atmosphere, and sensory details
        4. PLOT STRUCTURE: Outline beginning, conflict, climax, and resolution with specific plot points
        5. THEMES & SYMBOLISM: Specify underlying themes and symbolic elements
        6. TECHNICAL REQUIREMENTS: Word count, POV (first/third person), tense, dialogue ratio
        7. CREATIVE CONSTRAINTS: Specific challenges or unique requirements
        
        Return in this structure:
        TITLE: [Creative Title]
        GENRE: [Specific Genre]
        TONE: [Exact Tone]
        CHARACTERS: [Detailed Character Descriptions]
        SETTING: [Vivid Setting Details]
        PLOT: [Structured Plot Outline]
        THEMES: [Key Themes]
        TECHNICAL SPECS: [Word Count, POV, Tense, etc.]
        CONSTRAINTS: [Creative Limitations]
        """,
        
        "code_generation": """
        Transform this into a professional coding prompt with:
        1. LANGUAGE & VERSION: Specify exact programming language and version
        2. FUNCTION SPECIFICATION: Clear input parameters, return types, and function signature
        3. EDGE CASES: Specific edge cases and error conditions to handle
        4. PERFORMANCE: Time/space complexity requirements and optimization constraints
        5. STYLE GUIDE: Code formatting rules, naming conventions, documentation requirements
        6. TEST CASES: Specific input/output examples including edge cases
        7. DEPENDENCIES: Required libraries, packages, or external APIs
        8. ERROR HANDLING: How to handle exceptions and invalid inputs
        
        Return in this structure:
        PROBLEM STATEMENT: [Clear Description]
        FUNCTION SIGNATURE: [Exact Function Definition]
        INPUT FORMAT: [Input Specifications]
        OUTPUT FORMAT: [Output Specifications]
        CONSTRAINTS: [Technical Limitations]
        EXAMPLES: [Test Cases with Input/Output]
        NOTES: [Additional Requirements]
        """,
        
        "business_communication": """
        Transform this into a professional business communication prompt with:
        1. AUDIENCE: Specific target audience with their knowledge level and concerns
        2. PURPOSE: Clear objective and desired outcome
        3. TONE & STYLE: Formal, persuasive, informative, or motivational tone
        4. STRUCTURE: Specific sections to include (executive summary, introduction, body, conclusion, call-to-action)
        5. KEY POINTS: Mandatory points to cover with supporting data
        6. FORMAT: Email, report, proposal, presentation, or memo format
        7. LENGTH: Specific word count or time duration
        8. SUCCESS METRICS: How effectiveness will be measured
        
        Return in this structure:
        DOCUMENT TYPE: [Email/Report/Proposal/etc.]
        AUDIENCE: [Target Readers]
        OBJECTIVE: [Clear Purpose]
        KEY MESSAGES: [Main Points]
        STRUCTURE: [Document Outline]
        TONE: [Communication Style]
        LENGTH: [Word/Page Count]
        SUCCESS CRITERIA: [Effectiveness Metrics]
        """
    }
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="Professional Prompt Generator API",
    description="Transform basic prompts into detailed, professional AI prompts",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PromptEnhancer:
    @staticmethod
    def detect_category(prompt: str) -> PromptCategory:
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ['write', 'story', 'poem', 'character', 'fiction', 'narrative']):
            return PromptCategory.CREATIVE_WRITING
        elif any(word in prompt_lower for word in ['code', 'function', 'program', 'algorithm', 'python', 'javascript']):
            return PromptCategory.CODE_GENERATION
        elif any(word in prompt_lower for word in ['business', 'email', 'proposal', 'report', 'presentation', 'marketing']):
            return PromptCategory.BUSINESS_COMMUNICATION
        elif any(word in prompt_lower for word in ['research', 'paper', 'thesis', 'study', 'academic', 'analysis']):
            return PromptCategory.ACADEMIC_RESEARCH
        elif any(word in prompt_lower for word in ['data', 'analyze', 'statistics', 'chart', 'graph', 'visualization']):
            return PromptCategory.DATA_ANALYSIS
        
        return PromptCategory.GENERAL
    
    @staticmethod
    def calculate_quality_score(prompt: str) -> float:
        """Calculate a quality score for the enhanced prompt"""
        score = 0.0
        
        # Length check (optimal: 100-500 words)
        words = len(prompt.split())
        if 100 <= words <= 500:
            score += 25
        elif 50 <= words < 100 or 500 < words <= 800:
            score += 15
        else:
            score += 5
        
        # Specificity indicators
        specificity_terms = ['specific', 'detailed', 'exact', 'precise', 'concrete']
        if any(term in prompt.lower() for term in specificity_terms):
            score += 20
        
        # Structure indicators
        structure_terms = ['format', 'structure', 'outline', 'section', 'include']
        if any(term in prompt.lower() for term in structure_terms):
            score += 20
        
        # Constraint indicators
        constraint_terms = ['must', 'should', 'require', 'constraint', 'limit']
        if any(term in prompt.lower() for term in constraint_terms):
            score += 15
        
        # Example indicators
        if 'example' in prompt.lower() or 'for instance' in prompt.lower():
            score += 10
        
        # Tone indicators
        tone_terms = ['professional', 'formal', 'academic', 'technical']
        if any(term in prompt.lower() for term in tone_terms):
            score += 10
        
        return min(score, 100.0)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "service": "Professional Prompt Generator API",
        "status": "operational",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "enhance": "/api/v1/enhance (POST)",
            "batch": "/api/v1/enhance/batch (POST)",
            "categories": "/api/v1/categories"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Render"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "model_ready": gemini_model is not None
    }

@app.get("/api/v1/categories")
async def get_categories():
    """Get available prompt categories"""
    return {
        "categories": [
            {"id": "creative_writing", "name": "Creative Writing", "description": "Stories, poems, narratives"},
            {"id": "code_generation", "name": "Code Generation", "description": "Programming, algorithms, functions"},
            {"id": "business_communication", "name": "Business Communication", "description": "Emails, reports, proposals"},
            {"id": "academic_research", "name": "Academic Research", "description": "Papers, studies, analysis"},
            {"id": "data_analysis", "name": "Data Analysis", "description": "Data processing, visualization"},
            {"id": "general", "name": "General", "description": "All other prompts"}
        ]
    }

@app.post("/api/v1/enhance", response_model=EnhancedPromptResponse)
async def enhance_prompt(request: EnhancementRequest):
    """Enhance a single prompt"""
    try:
        if gemini_model is None:
            raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
        
        # Determine category
        category = request.category or PromptEnhancer.detect_category(request.prompt)
        
        # Build enhancement prompt
        enhancement_template = ENHANCEMENT_PROMPTS.get(
            category.value, 
            """Transform this basic prompt into a detailed, professional prompt with:
            1. Clear objectives and deliverables
            2. Specific requirements and constraints
            3. Format and structure guidelines
            4. Success criteria and evaluation metrics
            5. Appropriate tone and style for the context
            
            Make it comprehensive, actionable, and ready for professional use."""
        )
        
        full_prompt = f"""
        You are an expert prompt engineer. Transform this basic user request into a professional, detailed AI prompt.
        
        USER'S BASIC REQUEST: "{request.prompt}"
        
        CATEGORY: {category.value.replace('_', ' ').title()}
        TONE: {request.tone}
        INCLUDE EXAMPLES: {request.include_examples}
        
        ENHANCEMENT GUIDELINES:
        {enhancement_template}
        
        Provide only the enhanced prompt, no additional commentary.
        """
        
        # Call Gemini API
        response = await asyncio.to_thread(
            gemini_model.generate_content,
            full_prompt
        )
        
        enhanced_text = response.text.strip()
        
        # Generate unique ID
        import uuid
        prompt_id = str(uuid.uuid4())[:8]
        
        # Calculate metrics
        word_count = len(enhanced_text.split())
        token_estimate = len(enhanced_text) // 4
        quality_score = PromptEnhancer.calculate_quality_score(enhanced_text)
        
        return EnhancedPromptResponse(
            id=prompt_id,
            original_prompt=request.prompt,
            enhanced_prompt=enhanced_text,
            category=category.value,
            metadata={
                "tone": request.tone,
                "include_examples": request.include_examples,
                "target_length": request.target_length,
                "enhancement_template_used": category.value
            },
            created_at=datetime.now().isoformat(),
            word_count=word_count,
            token_estimate=token_estimate,
            quality_score=quality_score
        )
        
    except Exception as e:
        logger.error(f"Error enhancing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing prompt: {str(e)}")

@app.post("/api/v1/enhance/batch")
async def batch_enhance_prompts(request: BatchEnhancementRequest):
    """Enhance multiple prompts at once"""
    try:
        results = []
        
        for prompt in request.prompts:
            # Use the single enhancement endpoint logic
            enhancement_request = EnhancementRequest(
                prompt=prompt,
                category=request.category
            )
            
            # For batch, we'll do simple enhancement without API calls
            # In production, you'd want to implement proper batching
            category = request.category or PromptEnhancer.detect_category(prompt)
            
            enhanced_text = f"""Professional Prompt for: "{prompt}"

Category: {category.value.replace('_', ' ').title()}

Detailed Requirements:
1. Provide specific, actionable instructions
2. Include clear success criteria
3. Specify format and structure requirements
4. Add relevant constraints and limitations
5. Define the target audience or context

Expected Output:
- Comprehensive response addressing all specified requirements
- Professional tone appropriate for {category.value.replace('_', ' ')}
- Well-structured format with clear sections

Constraints:
- Must be original and creative
- Should follow best practices for {category.value.replace('_', ' ')} prompts
- Avoid vague language; be specific and detailed"""
            
            word_count = len(enhanced_text.split())
            token_estimate = len(enhanced_text) // 4
            
            results.append({
                "original": prompt,
                "enhanced": enhanced_text,
                "category": category.value,
                "word_count": word_count,
                "token_estimate": token_estimate
            })
        
        return {
            "batch_id": str(uuid.uuid4())[:8],
            "processed_count": len(results),
            "results": results,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "code": 500
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
