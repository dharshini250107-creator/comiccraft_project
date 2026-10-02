import base64
import json
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from services.story_generator import generate_story
from services.image_generator import generate_panel_images
from services.exporters import build_comic_pdf

BASE_DIR = Path(__file__).resolve().parent
GENERATED = BASE_DIR / "generated"

app = FastAPI(title="ComicCraft", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/generated", StaticFiles(directory=GENERATED), name="generated")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ComicCraft"}


@app.post("/api/generate")
async def generate_comic(
    prompt: str = Form(...),
    character_name: str = Form(...),
    setting: str = Form(...),
    tone: str = Form(...),
    art_style: str = Form(...),
    panels: int = Form(4),
):
    panels = max(2, min(panels, 8))

    data = {
        "prompt": prompt.strip(),
        "character_name": character_name.strip(),
        "setting": setting.strip(),
        "tone": tone.strip(),
        "art_style": art_style.strip(),
        "panels": panels,
    }

    story = generate_story(data)
    panel_images = generate_panel_images(story, data)

    comic_id = uuid.uuid4().hex
    image_urls = []

    for index, image_bytes in enumerate(panel_images, start=1):
        image_path = GENERATED / f"{comic_id}_panel_{index}.png"
        image_path.write_bytes(image_bytes)
        image_urls.append(f"/generated/{image_path.name}")

    for index, panel in enumerate(story["panels"]):
        panel["image_url"] = image_urls[index]

    return JSONResponse({
        "comic_id": comic_id,
        "title": story["title"],
        "panels": story["panels"],
        "notice": "AI-generated creative content. Review the story and images before publishing."
    })


@app.post("/api/export")
async def export_comic(
    comic_id: str = Form(...),
    title: str = Form(...),
    panels_json: str = Form(...),
):
    try:
        panels = json.loads(panels_json)
    except json.JSONDecodeError:
        return JSONResponse({"error": "Invalid panel data."}, status_code=400)

    if not isinstance(panels, list) or not panels:
        return JSONResponse({"error": "No comic panels supplied."}, status_code=400)

    safe_id = "".join(ch for ch in comic_id if ch.isalnum())
    if not safe_id:
        return JSONResponse({"error": "Invalid comic ID."}, status_code=400)

    pdf_path = GENERATED / f"ComicCraft_{safe_id}.pdf"

    try:
        build_comic_pdf(title, panels, GENERATED, pdf_path)
    except Exception as exc:
        return JSONResponse(
            {"error": f"PDF generation failed: {exc}"},
            status_code=500
        )

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name
    )
