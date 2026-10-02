# ComicCraft — AI Comic Story Creator

ComicCraft is a FastAPI web application that creates panel-by-panel comic stories using Gemini and generates illustrations using Stable Diffusion through Hugging Face Diffusers.

## Features

- FastAPI backend
- HTML/CSS/JavaScript frontend
- Gemini-powered story generation
- Stable Diffusion image generation
- Tone selection
- Art-style selection
- 2–8 comic panels
- Panel-by-panel preview
- PDF export using FPDF
- Built-in fallback mode for testing without AI APIs/models

## Project structure

```text
ComicCraft/
├── app.py
├── requirements.txt
├── .env.example
├── README.md
├── services/
│   ├── story_generator.py
│   ├── image_generator.py
│   └── exporters.py
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── generated/
```

## 1. Create virtual environment

Windows:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

If PowerShell activation is blocked:

```cmd
venv\Scripts\activate
```

Then:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Python version

Python 3.12 is a conservative choice for Diffusers/PyTorch compatibility. If Python 3.14 is already installed, you can try it first, but if PyTorch/Diffusers reports compatibility or wheel errors, use Python 3.12.

## 2. Run the application

```powershell
uvicorn app:app --reload
```

Open:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

## 3. Gemini setup

Set the API key in your terminal:

```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY"
$env:GEMINI_MODEL="gemini-3.8-flash"
uvicorn app:app --reload
```

Never expose your real API key in frontend JavaScript or GitHub.

If no Gemini API key is supplied, the app uses a deterministic local story fallback.

## 4. Stable Diffusion

The first time Diffusers loads a model, it may download a large model from Hugging Face. A CUDA-capable NVIDIA GPU is strongly recommended for practical local generation.

If the Diffusers/PyTorch stack is not available or cannot initialize, ComicCraft automatically creates preview placeholder PNGs so that the rest of the application and PDF workflow can still be tested.

For production image generation, use a suitable licensed model and follow its Hugging Face/model-card terms.

## 5. Complete workflow

1. Enter story prompt.
2. Enter character name.
3. Enter setting.
4. Select tone.
5. Select art style.
6. Select panel count.
7. Click Generate Comic.
8. Gemini creates the storyline.
9. Stable Diffusion creates panel images.
10. Frontend displays the comic.
11. Click Download PDF.
12. FPDF assembles each image, title, narration and dialogue into the PDF.

## 6. API endpoints

### GET /

Web interface.

### GET /health

Health check.

### POST /api/generate

Generates the story and panel images.

Form fields:

```text
prompt
character_name
setting
tone
art_style
panels
```

### POST /api/export

Creates the final PDF.

Form fields:

```text
comic_id
title
panels_json
```

## 7. Production improvements

For a production system, add:

- User authentication
- Database for comic projects
- Cloud object storage for images
- Background jobs/queues for image generation
- GPU inference service
- Rate limiting
- Prompt/content moderation
- Image safety filtering
- Model licensing verification
- Per-user quotas
- Secure API-key management
- Cleanup/retention jobs for generated files
- Automated tests
- Logging and monitoring
- Pagination for large projects

## 8. Important AI/image note

Image models may produce inconsistent characters across panels and may render text poorly. ComicCraft therefore generates narration/dialogue separately in the web UI and PDF instead of asking the image model to render speech text inside the artwork.
