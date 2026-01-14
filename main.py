from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai

# ======================================================
# ENVIRONMENT CHECK
# ======================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY is not set in environment variables")

# ======================================================
# GEMINI CONFIG
# ======================================================
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel(
    model_name="gemini-1.5-flash"
)

# ======================================================
# FASTAPI APP
# ======================================================
app = FastAPI(title="PromptFlow AI – Gemini Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Firebase + frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# REQUEST MODEL
# ======================================================
class PromptRequest(BaseModel):
    user_prompt: str
    prompt_type: str = "image"
    quality: str = "medium"

# ======================================================
# PROMPT TEMPLATES
# ======================================================
SYSTEM_PROMPTS = {
    "image": "You are a senior AI image prompt engineer specializing in cinematic, high-quality visuals.",
    "video": "You are a senior AI video prompt engineer creating detailed, production-ready video prompts.",
    "text": "You are a professional writing prompt engineer for articles, blogs, and copywriting.",
    "code": "You are a senior software architect creating precise, production-ready coding prompts.",
    "chat": "You are an expert conversational AI prompt designer."
}

QUALITY_HINTS = {
    "short": "Keep the prompt concise, clear, and efficient.",
    "medium": "Use balanced professional detail with clear structure.",
    "detailed": "Provide highly detailed, structured, and descriptive instructions.",
    "ultra": "Create an expert-level, extremely detailed, production-ready prompt."
}

# ======================================================
# HEALTH CHECK
# ======================================================
@app.get("/")
def root():
    return {
        "status": "✅ PromptFlow AI Gemini backend running"
    }

@app.get("/generate")
def generate_info():
    return {
        "message": "❗ Use POST /generate with JSON body"
    }

# ======================================================
# MAIN GENERATION ENDPOINT
# ======================================================
@app.post("/generate")
def generate_prompt(data: PromptRequest):
    try:
        system_role = SYSTEM_PROMPTS.get(
            data.prompt_type, SYSTEM_PROMPTS["image"]
        )
        quality_hint = QUALITY_HINTS.get(
            data.quality, QUALITY_HINTS["medium"]
        )

        final_prompt = f"""
ROLE:
{system_role}

QUALITY LEVEL:
{data.quality.upper()} – {quality_hint}

OBJECTIVE:
Transform the user idea into a professional AI-ready prompt.

USER IDEA:
{data.user_prompt}

OUTPUT RULES:
- Clear structure
- Professional tone
- Optimized for AI generation
- No explanations
- No markdown headers
- Deliver ONLY the final prompt
"""

        response = model.generate_content(final_prompt)

        if not response or not response.text:
            raise ValueError("Empty response from Gemini")

        return {
            "professional_prompt": response.text.strip()
        }

    except Exception as e:
        print("❌ Gemini Error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Gemini generation failed: {str(e)}"
        )
