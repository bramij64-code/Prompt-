from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai

# ======================================================
# ENV CHECK
# ======================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("❌ GEMINI_API_KEY not set")

# ======================================================
# GEMINI CONFIG (IMPORTANT FIX)
# ======================================================
genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel(
    model_name="gemini-pro"   # ✅ WORKING MODEL
)

# ======================================================
# FASTAPI APP
# ======================================================
app = FastAPI(title="PromptFlow AI – Gemini Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
# PROMPT LOGIC
# ======================================================
SYSTEM_PROMPTS = {
    "image": "You are a professional AI image prompt engineer.",
    "video": "You are a professional AI video prompt engineer.",
    "text": "You are a professional writing prompt engineer.",
    "code": "You are a senior software architect and coding prompt engineer.",
    "chat": "You are a conversational AI prompt designer."
}

QUALITY_HINTS = {
    "short": "Keep it concise and efficient.",
    "medium": "Balanced professional detail.",
    "detailed": "Highly detailed and structured.",
    "ultra": "Extremely detailed, expert-level, production-ready."
}

# ======================================================
# ROUTES
# ======================================================
@app.get("/")
def root():
    return {"status": "✅ Gemini backend running"}

@app.post("/generate")
def generate_prompt(data: PromptRequest):
    try:
        system_role = SYSTEM_PROMPTS.get(data.prompt_type, SYSTEM_PROMPTS["image"])
        quality_hint = QUALITY_HINTS.get(data.quality, QUALITY_HINTS["medium"])

        prompt = f"""
ROLE:
{system_role}

QUALITY:
{quality_hint}

USER IDEA:
{data.user_prompt}

INSTRUCTIONS:
Generate a professional, optimized AI prompt.
No explanation. Only final prompt.
"""

        response = model.generate_content(prompt)

        if not response.text:
            raise ValueError("Empty response")

        return {
            "professional_prompt": response.text.strip()
        }

    except Exception as e:
        print("❌ Gemini Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
