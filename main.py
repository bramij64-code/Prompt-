===============================

Prompt Generator AI - Backend Only

Tech: Python + FastAPI + OpenAI

===============================

---------- requirements ----------

pip install fastapi uvicorn openai pydantic python-dotenv

---------- file: main.py ----------

from fastapi import FastAPI from pydantic import BaseModel from typing import Literal import os import openai

Load API key safely (recommended)

Set environment variable: OPENAI_API_KEY=your_key_here

openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI(title="Prompt Generator AI", version="1.0")

---------- request schema ----------

class PromptRequest(BaseModel): user_prompt: str prompt_type: Literal["image", "video", "text"] = "image" quality: Literal["short", "medium", "ultra"] = "medium"

---------- system prompts ----------

SYSTEM_PROMPTS = { "image": """ You are an expert AI image prompt engineer. Convert simple ideas into professional, cinematic, high-quality image prompts. Automatically add subject detail, environment, lighting, camera, realism, style, and quality. Do not explain anything. Output only the final prompt. """, "video": """ You are an expert AI video generation prompt engineer. Convert simple ideas into cinematic video prompts. Include scene description, camera movement, lighting, motion, mood, and realism. Do not explain anything. Output only the final prompt. """, "text": """ You are an expert writing prompt engineer. Convert simple ideas into clear, detailed, professional writing prompts. Improve clarity, depth, structure, and creativity. Do not explain anything. Output only the final prompt. """, }

QUALITY_HINTS = { "short": "Keep the prompt concise but professional.", "medium": "Provide a balanced level of detail and quality.", "ultra": "Make the prompt extremely detailed, cinematic, and premium quality.", }

---------- API endpoint ----------

@app.post("/generate") def generate_prompt(data: PromptRequest): system_prompt = SYSTEM_PROMPTS[data.prompt_type] + "\n" + QUALITY_HINTS[data.quality]

response = openai.ChatCompletion.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": data.user_prompt}
    ],
    temperature=0.8
)

return {
    "input": data.user_prompt,
    "type": data.prompt_type,
    "quality": data.quality,
    "professional_prompt": response.choices[0].message.content.strip()
}

---------- health check ----------

@app.get("/") def root(): return {"status": "Prompt Generator AI backend is running"}

---------- run server ----------

uvicorn main:app --reload
