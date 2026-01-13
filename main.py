from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from openai import OpenAI

# Initialize OpenAI client (NEW API)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(title="Prompt Generator AI")

# CORS (required for frontend + Firebase)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- Request Model --------
class PromptRequest(BaseModel):
    user_prompt: str
    prompt_type: str = "image"   # image | video | text
    quality: str = "medium"      # short | medium | ultra

# -------- System Prompts --------
SYSTEM_PROMPTS = {
    "image": "You are an expert AI image prompt engineer. Generate a cinematic, professional, high-quality image prompt.",
    "video": "You are an expert AI video prompt engineer. Generate a cinematic, detailed video generation prompt.",
    "text": "You are an expert writing prompt engineer. Generate a clear, professional, high-quality writing prompt."
}

QUALITY_HINTS = {
    "short": "Keep the prompt concise and professional.",
    "medium": "Provide balanced detail and quality.",
    "ultra": "Make the prompt extremely detailed, cinematic, and premium quality."
}

# -------- Health Check --------
@app.get("/")
def root():
    return {"status": "Backend running successfully"}

# -------- Prompt Generator --------
@app.post("/generate")
def generate_prompt(data: PromptRequest):
    system_prompt = (
        SYSTEM_PROMPTS.get(data.prompt_type, SYSTEM_PROMPTS["image"])
        + " "
        + QUALITY_HINTS.get(data.quality, QUALITY_HINTS["medium"])
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": data.user_prompt}
        ],
        temperature=0.8,
    )

    return {
        "professional_prompt": response.choices[0].message.content.strip()
    }
