from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import google.generativeai as genai

# ------------------ GEMINI CONFIG ------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

app = FastAPI(title="Prompt Generator AI", version="1.0")

# ------------------ CORS ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ REQUEST MODEL ------------------
class PromptRequest(BaseModel):
    user_prompt: str
    prompt_type: str = "image"     # image | video | text | code | chat
    quality: str = "medium"        # short | medium | detailed | ultra

# ------------------ PROMPT ROLES ------------------
SYSTEM_ROLES = {
    "image": "You are a senior AI image prompt engineer specialized in cinematic, photorealistic, and artistic prompts.",
    "video": "You are a senior AI video prompt engineer specialized in cinematic shots, pacing, camera movement, and storytelling.",
    "text": "You are a senior AI writing prompt engineer specialized in articles, scripts, storytelling, and persuasive writing.",
    "code": "You are a senior AI coding prompt engineer specialized in clean architecture, best practices, and scalable solutions.",
    "chat": "You are a senior conversational AI prompt engineer specialized in natural, helpful, and role-based dialogues."
}

QUALITY_RULES = {
    "short": "Keep the prompt concise, minimal, and focused on core intent.",
    "medium": "Provide balanced detail with clear structure and professional clarity.",
    "detailed": "Provide highly detailed instructions with structured sections and strong clarity.",
    "ultra": "Produce an expert-level, extremely detailed, professional-grade prompt with advanced constraints and guidance."
}

# ------------------ HEALTH CHECK ------------------
@app.get("/")
def root():
    return {"status": "Gemini Prompt Generator Backend Running"}

# ------------------ PROMPT GENERATION ------------------
@app.post("/generate")
def generate_prompt(data: PromptRequest):
    role = SYSTEM_ROLES.get(data.prompt_type, SYSTEM_ROLES["image"])
    quality_rule = QUALITY_RULES.get(data.quality, QUALITY_RULES["medium"])

    meta_prompt = f"""
{role}

You are designing a HIGH-QUALITY PROFESSIONAL PROMPT.

QUALITY LEVEL:
{quality_rule}

TASK:
Transform the user's raw idea into a professional, optimized AI prompt.

PROMPT STRUCTURE (MANDATORY):
1. Role / Perspective
2. Objective (What to generate)
3. Context & Details
4. Style & Tone
5. Constraints & Rules
6. Output Expectations

IMPORTANT RULES:
- Do NOT explain the prompt.
- Do NOT add commentary.
- Output ONLY the final prompt text.
- Make it ready to paste directly into an AI model.

USER IDEA:
{data.user_prompt}
"""

    response = model.generate_content(meta_prompt)

    return {
        "professional_prompt": response.text.strip(),
        "prompt_type": data.prompt_type,
        "quality": data.quality
    }
