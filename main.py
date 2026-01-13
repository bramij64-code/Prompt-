from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from openai import OpenAI

# ---------- OpenAI Client ----------
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=api_key)

app = FastAPI(title="Prompt Generator AI")

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Request Model ----------
class PromptRequest(BaseModel):
    user_prompt: str
    prompt_type: str = "image"
    quality: str = "medium"

# ---------- System Prompts ----------
SYSTEM_PROMPTS = {
    "image": "You are an expert AI image prompt engineer.",
    "video": "You are an expert AI video prompt engineer.",
    "text": "You are an expert writing prompt engineer.",
    "code": "You are a senior software engineer generating production-grade coding prompts.",
    "chat": "You are an expert conversational AI prompt designer."
}

QUALITY_HINTS = {
    "short": "Keep the prompt concise and clear.",
    "medium": "Provide balanced detail and clarity.",
    "detailed": "Create a well-structured, advanced, and descriptive prompt.",
    "ultra": "Create an expert-level, extremely detailed, cinematic prompt."
}

# ---------- Health Check ----------
@app.get("/")
def root():
    return {"status": "Backend running successfully"}

# ---------- Prompt Generator ----------
@app.post("/generate")
def generate_prompt(data: PromptRequest):
    system_prompt = (
        SYSTEM_PROMPTS.get(data.prompt_type, SYSTEM_PROMPTS["image"])
        + " "
        + QUALITY_HINTS.get(data.quality, QUALITY_HINTS["medium"])
    )

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # SAFE MODEL (works on all accounts)
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": data.user_prompt}
            ],
            temperature=0.8,
        )

        return {
            "professional_prompt": response.choices[0].message.content.strip()
        }

    except Exception as e:
        # Prevent 500 crash, return readable error
        raise HTTPException(status_code=500, detail=str(e))
