import os
import json
import httpx
import uuid
from datetime import datetime
from typing import Optional, Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Models
class Category(str):
    CREATIVE_WRITING = "creative_writing"
    CODE_GENERATION = "code_generation"
    ACADEMIC_RESEARCH = "academic_research"
    BUSINESS_COMMUNICATION = "business_communication"
    DATA_ANALYSIS = "data_analysis"
    GENERAL = "general"

class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000, description="The basic prompt to enhance")
    category: Optional[str] = Field(None, description="Prompt category (optional)")
    tone: Optional[str] = Field("professional", description="Tone of the enhanced prompt")
    include_examples: Optional[bool] = Field(True, description="Include examples in the prompt")
    target_length: Optional[str] = Field("detailed", description="brief, detailed, or comprehensive")

class BatchPromptRequest(BaseModel):
    prompts: List[str] = Field(..., min_items=1, max_items=10)
    category: Optional[str] = None

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
    status: str = "success"

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str
    version: str

# Initialize FastAPI
app = FastAPI(
    title="Professional Prompt Generator API",
    description="Transform basic prompts into detailed, professional AI prompts",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeminiAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    
    async def generate(self, prompt: str) -> str:
        """Call Gemini API using direct HTTP requests"""
        url = f"{self.base_url}?key={self.api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 1,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                if "candidates" in data and len(data["candidates"]) > 0:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    raise Exception("No candidates in response")
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
                raise Exception(f"API error: {e.response.status_code}")
            except Exception as e:
                logger.error(f"Gemini API error: {str(e)}")
                raise Exception(f"Failed to call Gemini API: {str(e)}")

class PromptEnhancer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.gemini = GeminiAPI(self.api_key) if self.api_key else None
        
    def detect_category(self, prompt: str) -> str:
        """Auto-detect prompt category"""
        prompt_lower = prompt.lower()
        
        categories = {
            Category.CREATIVE_WRITING: ['write', 'story', 'poem', 'character', 'fiction', 'narrative', 'creative'],
            Category.CODE_GENERATION: ['code', 'function', 'program', 'algorithm', 'python', 'javascript', 'java', 'html'],
            Category.BUSINESS_COMMUNICATION: ['business', 'email', 'proposal', 'report', 'presentation', 'marketing', 'sales'],
            Category.ACADEMIC_RESEARCH: ['research', 'paper', 'thesis', 'study', 'academic', 'essay', 'analysis'],
            Category.DATA_ANALYSIS: ['data', 'analyze', 'statistics', 'chart', 'graph', 'visualization', 'excel']
        }
        
        for category, keywords in categories.items():
            if any(keyword in prompt_lower for keyword in keywords):
                return category
        return Category.GENERAL
    
    def get_enhancement_template(self, category: str) -> str:
        """Get enhancement template based on category"""
        templates = {
            Category.CREATIVE_WRITING: """
            Transform this into a professional creative writing prompt with:
            1. SPECIFIC GENRE & STYLE: Specify exact genre, tone, and writing style
            2. CHARACTER DEVELOPMENT: Define main characters with specific traits and arcs
            3. SETTING DETAILS: Provide vivid location, time period, and atmosphere
            4. PLOT STRUCTURE: Outline beginning, conflict, climax, and resolution
            5. THEMES & SYMBOLISM: Specify underlying themes
            6. TECHNICAL REQUIREMENTS: Word count, POV, tense, dialogue ratio
            7. CREATIVE CONSTRAINTS: Specific challenges or unique requirements
            
            Format the response clearly with sections.
            """,
            
            Category.CODE_GENERATION: """
            Transform this into a professional coding prompt with:
            1. LANGUAGE & VERSION: Specify exact programming language and version
            2. FUNCTION SPECIFICATION: Clear input parameters and return types
            3. EDGE CASES: Specific edge cases to handle
            4. PERFORMANCE: Time/space complexity requirements
            5. STYLE GUIDE: Code formatting rules and documentation
            6. TEST CASES: Specific input/output examples
            7. ERROR HANDLING: How to handle exceptions
            
            Format the response clearly with sections.
            """,
            
            Category.BUSINESS_COMMUNICATION: """
            Transform this into a professional business communication prompt with:
            1. AUDIENCE: Specific target audience with their knowledge level
            2. PURPOSE: Clear objective and desired outcome
            3. TONE & STYLE: Formal, persuasive, or informative tone
            4. STRUCTURE: Specific sections to include
            5. KEY POINTS: Mandatory points to cover
            6. FORMAT: Email, report, proposal, or presentation format
            7. LENGTH: Specific word count or duration
            8. SUCCESS METRICS: How effectiveness will be measured
            
            Format the response clearly with sections.
            """,
            
            Category.ACADEMIC_RESEARCH: """
            Transform this into a professional academic research prompt with:
            1. ACADEMIC LEVEL: Undergraduate, graduate, or doctoral
            2. RESEARCH QUESTION: Clear and specific research question
            3. METHODOLOGY: Required research methods
            4. SOURCES: Required number and type of sources
            5. CITATION STYLE: APA, MLA, Chicago, etc.
            6. STRUCTURE: Required sections (abstract, intro, methodology, etc.)
            7. WORD COUNT: Specific length requirement
            8. EVALUATION CRITERIA: How the work will be graded
            
            Format the response clearly with sections.
            """,
            
            Category.DATA_ANALYSIS: """
            Transform this into a professional data analysis prompt with:
            1. DATA SOURCES: Specify where data comes from
            2. ANALYSIS METHODS: Required statistical tests or methods
            3. VISUALIZATION: Required charts or graphs
            4. TOOLS: Specific software or libraries to use
            5. OUTPUT FORMAT: How results should be presented
            6. KEY INSIGHTS: What insights to extract
            7. LIMITATIONS: Analysis constraints or limitations
            
            Format the response clearly with sections.
            """
        }
        
        return templates.get(category, """
        Transform this basic prompt into a detailed, professional prompt with:
        1. Clear objectives and deliverables
        2. Specific requirements and constraints
        3. Format and structure guidelines
        4. Success criteria and evaluation metrics
        5. Appropriate tone and style
        
        Make it comprehensive, actionable, and ready for professional use.
        Format the response clearly with sections.
        """)
    
    def calculate_metrics(self, prompt: str) -> Dict:
        """Calculate prompt metrics"""
        words = len(prompt.split())
        chars = len(prompt)
        
        # Calculate quality score (simplified)
        score = 0.0
        if words > 50: score += 25
        if "specific" in prompt.lower() or "detailed" in prompt.lower(): score += 25
        if "format" in prompt.lower() or "structure" in prompt.lower(): score += 25
        if "must" in prompt.lower() or "should" in prompt.lower(): score += 25
        score = min(score, 100.0)
        
        return {
            "word_count": words,
            "char_count": chars,
            "token_estimate": chars // 4,
            "quality_score": score
        }
    
    async def enhance(self, request: PromptRequest) -> EnhancedPromptResponse:
        """Main enhancement logic"""
        # Determine category
        category = request.category or self.detect_category(request.prompt)
        
        # Build enhancement prompt
        template = self.get_enhancement_template(category)
        
        enhancement_prompt = f"""
        You are an expert prompt engineer. Transform this basic user request into a professional, detailed AI prompt.
        
        USER'S BASIC REQUEST: "{request.prompt}"
        
        CATEGORY: {category.replace('_', ' ').title()}
        TONE: {request.tone}
        INCLUDE EXAMPLES: {request.include_examples}
        TARGET LENGTH: {request.target_length}
        
        ENHANCEMENT GUIDELINES:
        {template}
        
        Provide ONLY the enhanced professional prompt. No additional commentary or explanations.
        Make it detailed, specific, and ready to be used with an AI system.
        """
        
        # Get enhanced prompt
        if self.gemini:
            try:
                enhanced_text = await self.gemini.generate(enhancement_prompt)
            except Exception as e:
                logger.warning(f"Gemini API failed, using fallback: {e}")
                enhanced_text = self._fallback_enhancement(request.prompt, category)
        else:
            logger.warning("No Gemini API key, using fallback enhancement")
            enhanced_text = self._fallback_enhancement(request.prompt, category)
        
        # Calculate metrics
        metrics = self.calculate_metrics(enhanced_text)
        
        # Create response
        return EnhancedPromptResponse(
            id=str(uuid.uuid4())[:8],
            original_prompt=request.prompt,
            enhanced_prompt=enhanced_text.strip(),
            category=category,
            metadata={
                "tone": request.tone,
                "include_examples": request.include_examples,
                "target_length": request.target_length,
                "enhancement_method": "gemini_api" if self.gemini else "fallback"
            },
            created_at=datetime.now().isoformat(),
            word_count=metrics["word_count"],
            token_estimate=metrics["token_estimate"],
            quality_score=metrics["quality_score"]
        )
    
    def _fallback_enhancement(self, prompt: str, category: str) -> str:
        """Fallback enhancement when Gemini API is unavailable"""
        category_name = category.replace('_', ' ').title()
        
        return f"""PROFESSIONAL PROMPT: {prompt}

CATEGORY: {category_name}

DETAILED REQUIREMENTS:

1. OBJECTIVE:
- Clearly define the primary goal and desired outcome
- Specify what success looks like for this task

2. CONTEXT & BACKGROUND:
- Provide necessary background information
- Explain the purpose and importance of this task
- Define the target audience or end-user

3. SPECIFIC REQUIREMENTS:
- List all mandatory elements that must be included
- Define any constraints or limitations
- Specify technical or creative requirements

4. FORMAT & STRUCTURE:
- Describe the expected output format
- Outline the required structure or sections
- Specify length, style, and tone requirements

5. QUALITY CRITERIA:
- Define how quality will be measured
- List specific evaluation metrics
- Include any rubrics or scoring guidelines

6. EXAMPLES (if applicable):
- Provide sample inputs and expected outputs
- Include templates or formats to follow
- Show examples of successful implementations

7. ADDITIONAL NOTES:
- Any special considerations or edge cases
- Resources or references to use
- Deadline or timeline information

EXPECTED OUTPUT:
A comprehensive, professional response that addresses all specified requirements with {category_name} best practices.

CONSTRAINTS:
- Must be original and creative
- Should follow {category_name} conventions
- Avoid vague language; be specific and actionable
- Maintain professional tone throughout"""

# Initialize enhancer
enhancer = PromptEnhancer()

# Routes
@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint"""
    return HealthResponse(
        status="operational",
        timestamp=datetime.now().isoformat(),
        service="Professional Prompt Generator API",
        version="2.0.0"
    )

@app.get("/health")
async def health():
    """Health check endpoint for Render"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gemini_configured": os.getenv("GEMINI_API_KEY") is not None
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
async def enhance_prompt(request: PromptRequest):
    """Enhance a single prompt"""
    try:
        result = await enhancer.enhance(request)
        return result
    except Exception as e:
        logger.error(f"Error enhancing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing prompt: {str(e)}")

@app.post("/api/v1/enhance/batch")
async def enhance_batch(request: BatchPromptRequest):
    """Enhance multiple prompts (simplified)"""
    results = []
    
    for prompt in request.prompts:
        try:
            req = PromptRequest(
                prompt=prompt,
                category=request.category
            )
            result = await enhancer.enhance(req)
            results.append(result.dict())
        except Exception as e:
            results.append({
                "original_prompt": prompt,
                "enhanced_prompt": f"Error: {str(e)}",
                "category": request.category or "general",
                "status": "error",
                "error": str(e)
            })
    
    return {
        "batch_id": str(uuid.uuid4())[:8],
        "count": len(results),
        "successful": len([r for r in results if r.get("status") != "error"]),
        "failed": len([r for r in results if r.get("status") == "error"]),
        "results": results,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/example/{category}")
async def get_example(category: str):
    """Get example enhanced prompts"""
    examples = {
        "creative_writing": {
            "original": "Write a story about a dragon",
            "enhanced": """PROFESSIONAL PROMPT: Write a story about a dragon

CATEGORY: Creative Writing

GENRE: Modern Fantasy with elements of Mystery
TONE: Whimsical yet philosophical
AUDIENCE: Young adults (18-25)

CHARACTERS:
1. IGNIS - A 500-year-old dragon who has lost his ability to breathe fire and now works as a librarian
   - Personality: Intellectual, melancholic, secretly nostalgic for his fiery past
   - Motivation: Discovers a rare book that might restore his fire, but it's checked out
2. ELARA - A human library assistant studying dragon lore
   - Personality: Curious, empathetic, struggling with student debt
   - Motivation: Wants to prove dragons are misunderstood, not monsters

SETTING:
- Primary Location: The Grand Municipal Library of New York (hidden dragon section)
- Time Period: Present day with hidden magic
- Atmosphere: Dusty, mysterious, with occasional magical glows from enchanted books

PLOT STRUCTURE:
- Act 1: Ignis discovers the "Tome of Eternal Flame" is missing; Elara notices his distress
- Act 2: They team up to track the book, discovering it was stolen by a dragon hunter
- Act 3: Confrontation where they learn the hunter wants fire to save his dying village
- Resolution: They find a compromise - Ignis teaches controlled fire techniques

THEMES:
- The nature of power and its responsible use
- Interspecies understanding and cooperation
- Finding purpose when you've lost your defining trait

TECHNICAL REQUIREMENTS:
- Word Count: 3,000-4,000 words
- POV: Third-person limited, alternating between Ignis and Elara
- Tense: Past tense
- Dialogue: 40% dialogue, showing cultural misunderstandings

CONSTRAINTS:
- No traditional dragon hoarding tropes
- Must include at least 3 library-related metaphors
- Fire restoration must have a cost or limitation

EVALUATION CRITERIA:
- Originality of dragon characterization
- Emotional arc for both characters
- Integration of modern and fantasy elements
- Thematic depth and subtlety"""
        },
        "code_generation": {
            "original": "Create a Python function",
            "enhanced": """PROFESSIONAL PROMPT: Create a Python function to validate and format email addresses

CATEGORY: Code Generation

FUNCTION SIGNATURE:
def validate_and_format_email(email: str, domain_check: bool = True) -> tuple[bool, str]:

PARAMETERS:
1. email (str): The email address to validate and format
2. domain_check (bool): Whether to check if the domain has valid MX records

RETURNS:
tuple[bool, str]: 
- bool: True if email is valid and properly formatted
- str: The formatted email address, or error message if invalid

REQUIREMENTS:
1. VALIDATION CHECKS:
   - Basic format validation (RFC 5322 compliant)
   - Local part length (max 64 characters)
   - Domain part length (max 255 characters)
   - No consecutive dots in local or domain parts
   - Top-level domain must be 2+ characters

2. FORMATTING RULES:
   - Convert to lowercase
   - Remove any leading/trailing whitespace
   - Remove duplicate dots
   - Ensure proper '@' symbol usage

3. DOMAIN VERIFICATION (if domain_check=True):
   - Check MX records exist for domain
   - Timeout after 5 seconds for DNS lookup
   - Handle DNS resolution errors gracefully

4. ERROR HANDLING:
   - Return specific error messages for each validation failure
   - Handle Unicode characters in internationalized email addresses
   - Log validation attempts (debug level)

5. PERFORMANCE:
   - Time complexity: O(n) where n is email length
   - Memory: O(1) auxiliary space
   - Support batch processing of 10,000+ emails efficiently

TEST CASES:
Input: "  USER@EXAMPLE.COM  "
Output: (True, "user@example.com")

Input: "user..name@domain.com"
Output: (False, "Error: Consecutive dots in local part")

Input: "user@nonexistent.qq"
Output (with domain_check=True): (False, "Error: Domain has no MX records")

EDGE CASES TO HANDLE:
1. Internationalized email addresses (UTF-8)
2. Plus addressing (user+tag@domain.com)
3. IP address domains (user@[192.168.1.1])
4. Quoted strings in local part
5. Long TLDs (.museum, .travel)

DOCUMENTATION REQUIREMENTS:
- Google-style docstring with examples
- Type hints for all parameters and return values
- Include complexity analysis in comments
- Add usage examples in docstring

DEPENDENCIES:
- Standard library only (re, socket, email.utils)
- Optional: typing for type hints

ERROR MESSAGES:
Must be user-friendly and actionable, not technical jargon."""
        }
    }
    
    example = examples.get(category, examples["creative_writing"])
    return example

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
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
