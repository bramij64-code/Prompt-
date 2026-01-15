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

# Models (Pydantic v1 syntax)
class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)
    category: Optional[str] = None
    tone: Optional[str] = "professional"
    include_examples: Optional[bool] = True
    target_length: Optional[str] = "detailed"

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

class PromptEnhancer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
    
    def detect_category(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        
        if any(word in prompt_lower for word in ['write', 'story', 'poem', 'character', 'fiction']):
            return "creative_writing"
        elif any(word in prompt_lower for word in ['code', 'function', 'program', 'algorithm', 'python']):
            return "code_generation"
        elif any(word in prompt_lower for word in ['business', 'email', 'proposal', 'report', 'marketing']):
            return "business_communication"
        elif any(word in prompt_lower for word in ['research', 'paper', 'thesis', 'study', 'academic']):
            return "academic_research"
        elif any(word in prompt_lower for word in ['data', 'analyze', 'statistics', 'chart', 'graph']):
            return "data_analysis"
        return "general"
    
    async def call_gemini_api(self, prompt: str) -> str:
        """Call Gemini API using direct HTTP requests"""
        if not self.api_key:
            raise Exception("Gemini API key not configured")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.api_key}"
        
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2048,
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                if "candidates" in data and len(data["candidates"]) > 0:
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    return "Error: No response from AI"
                    
            except Exception as e:
                logger.error(f"Gemini API error: {e}")
                raise Exception(f"API call failed: {str(e)}")
    
    def calculate_metrics(self, prompt: str) -> Dict:
        words = len(prompt.split())
        chars = len(prompt)
        
        # Simple quality calculation
        score = 0.0
        if words > 50: score += 25
        if "specific" in prompt.lower(): score += 25
        if "format" in prompt.lower(): score += 25
        if "must" in prompt.lower(): score += 25
        
        return {
            "word_count": words,
            "token_estimate": chars // 4,
            "quality_score": min(score, 100.0)
        }
    
    def _fallback_enhancement(self, prompt: str, category: str) -> str:
        """Fallback when Gemini API is unavailable"""
        category_name = category.replace('_', ' ').title()
        
        templates = {
            "creative_writing": f"""PROFESSIONAL WRITING PROMPT: {prompt}

GENRE: Specified based on prompt
TONE: Professional, engaging
LENGTH: 1000-2000 words

CHARACTERS:
- Protagonist with clear motivation
- Supporting characters with distinct personalities
- Antagonist with believable motivations

SETTING:
- Vivid, sensory-rich environment
- Appropriate time period
- Consistent world-building

PLOT STRUCTURE:
- Clear beginning, middle, and end
- Rising action and climax
- Satisfying resolution

REQUIREMENTS:
- Show, don't tell
- Use active voice
- Include dialogue
- Create emotional impact""",
            
            "code_generation": f"""PROFESSIONAL CODING PROMPT: {prompt}

LANGUAGE: Python 3.10+
REQUIREMENTS:
- Clean, documented code
- Error handling
- Type hints
- Unit tests

FUNCTIONALITY:
- Clear input/output specification
- Edge cases handled
- Performance considerations
- Security best practices

STRUCTURE:
- Modular design
- Appropriate separation of concerns
- Follows PEP 8 guidelines

DELIVERABLES:
- Working code
- Documentation
- Test cases
- Usage examples""",
            
            "business_communication": f"""PROFESSIONAL BUSINESS PROMPT: {prompt}

AUDIENCE: Professional stakeholders
TONE: Formal, clear, persuasive
FORMAT: Structured document/email

CONTENT:
- Clear objective statement
- Supporting arguments/data
- Call to action
- Professional closing

STRUCTURE:
- Introduction
- Body with key points
- Conclusion
- Next steps

REQUIREMENTS:
- Professional language
- Data-driven arguments
- Clear formatting
- Proofread for errors"""
        }
        
        return templates.get(category, f"""PROFESSIONAL PROMPT: {prompt}

OBJECTIVES:
- Clear, specific goals
- Measurable outcomes
- Realistic constraints

REQUIREMENTS:
- Detailed specifications
- Quality standards
- Delivery timeline

FORMAT:
- Structured response
- Appropriate length
- Professional tone

EVALUATION:
- Success criteria
- Quality metrics
- Review process""")
    
    async def enhance(self, request: PromptRequest) -> EnhancedPromptResponse:
        category = request.category or self.detect_category(request.prompt)
        
        # Build enhancement prompt
        enhancement_prompt = f"""
        Transform this basic prompt into a detailed, professional AI prompt:
        
        Original: "{request.prompt}"
        
        Category: {category}
        Tone: {request.tone}
        
        Make it specific, actionable, and ready for professional use.
        Include clear objectives, requirements, format guidelines, and success criteria.
        
        Return ONLY the enhanced prompt, no additional text.
        """
        
        # Get enhanced prompt
        enhanced_text = self._fallback_enhancement(request.prompt, category)
        
        # Try Gemini API if key is available
        if self.api_key:
            try:
                enhanced_text = await self.call_gemini_api(enhancement_prompt)
            except Exception as e:
                logger.warning(f"Using fallback enhancement: {e}")
        
        # Calculate metrics
        metrics = self.calculate_metrics(enhanced_text)
        
        return EnhancedPromptResponse(
            id=str(uuid.uuid4())[:8],
            original_prompt=request.prompt,
            enhanced_prompt=enhanced_text.strip(),
            category=category,
            metadata={
                "tone": request.tone,
                "include_examples": request.include_examples,
                "target_length": request.target_length
            },
            created_at=datetime.now().isoformat(),
            word_count=metrics["word_count"],
            token_estimate=metrics["token_estimate"],
            quality_score=metrics["quality_score"]
        )

# Initialize enhancer
enhancer = PromptEnhancer()

# Routes
@app.get("/")
async def root():
    return {
        "service": "Prompt Generator API",
        "status": "running",
        "version": "2.0.0",
        "endpoints": {
            "health": "/health",
            "enhance": "/api/enhance (POST)",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gemini_configured": os.getenv("GEMINI_API_KEY") is not None
    }

@app.post("/api/enhance", response_model=EnhancedPromptResponse)
async def enhance_prompt(request: PromptRequest):
    try:
        return await enhancer.enhance(request)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories")
async def get_categories():
    return {
        "categories": [
            {"id": "creative_writing", "name": "Creative Writing"},
            {"id": "code_generation", "name": "Code Generation"},
            {"id": "business_communication", "name": "Business Communication"},
            {"id": "academic_research", "name": "Academic Research"},
            {"id": "data_analysis", "name": "Data Analysis"},
            {"id": "general", "name": "General"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
