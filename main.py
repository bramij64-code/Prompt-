from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai

# =====================================================
# CONFIG
# =====================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY is missing")

genai.configure(api_key=GEMINI_API_KEY)

# ✅ CORRECT MODEL NAME
model = genai.GenerativeModel("models/gemini-1.0-pro")

# =====================================================
# APP
# =====================================================
app = FastAPI(title="PromptFlow AI – Gemini Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# REQUEST MODEL
# =====================================================
class PromptRequest(BaseModel):
    user_prompt: str
    prompt_type: str = "image"
    quality: str = "medium"

# =====================================================
# PROMPT LOGIC
# =====================================================
SYSTEM_PROMPTS = {
    "image": "You are a professional AI image prompt engineer.",
    "video": "You are a professional AI video prompt engineer.",
    "text": "You are a professional writing prompt engineer.",
    "code": "You are a senior software architect and coding prompt engineer.",
    "chat": "You are a conversational AI prompt designer."
}

QUALITY_HINTS = {
    "short": "Keep it concise and clean.",
    "medium": "Balanced professional detail.",
    "detailed": "Highly detailed and structured.",
    "ultra": "Extremely detailed, expert-level, production-ready."
}

# =====================================================
# ROUTES
# =====================================================
@app.get("/")
def health():
    return {"status": "✅ Gemini backend running"}

@app.post("/generate")
def generate_prompt(data: PromptRequest):
    try:
        role = SYSTEM_PROMPTS.get(data.prompt_type, SYSTEM_PROMPTS["image"])
        quality = QUALITY_HINTS.get(data.quality, QUALITY_HINTS["medium"])

        prompt = f"""
ROLE:
{role}

QUALITY:
{quality}

USER IDEA:
{data.user_prompt}

RULES:
- Output only the final optimized prompt
- No explanations
- Professional structure
"""

        response = model.generate_content(prompt)

        if not response.text:
            raise ValueError("Empty response from Gemini")

        return {
            "professional_prompt": response.text.strip()
        }

    except Exception as e:
        print("❌ Gemini error:", e)
        raise HTTPException(status_code=500, detail=str(e))
