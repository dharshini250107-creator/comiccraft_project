import os
from io import BytesIO
from pathlib import Path

try:
    import torch
    from diffusers import StableDiffusionPipeline
except ImportError:
    torch = None
    StableDiffusionPipeline = None

MODEL_ID = os.getenv(
    "SD_MODEL",
    "runwayml/stable-diffusion-v1-5"
)

_PIPELINE = None


def _placeholder_png(text: str) -> bytes:
    # Creates a valid PNG fallback without requiring an image model.
    try:
        from PIL import Image, ImageDraw, ImageFont
        image = Image.new("RGB", (1024, 768), "white")
        draw = ImageDraw.Draw(image)
        font = ImageFont.load_default()
        lines = []
        words = text.split()
        current = ""
        for word in words:
            test = (current + " " + word).strip()
            if len(test) > 55:
                lines.append(current)
                current = word
            else:
                current = test
        if current:
            lines.append(current)

        y = 100
        draw.text((50, 40), "ComicCraft Preview", fill="black", font=font)
        for line in lines[:12]:
            draw.text((50, y), line, fill="black", font=font)
            y += 35

        output = BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()
    except Exception as exc:
        raise RuntimeError("Pillow is required for image fallback.") from exc


def get_pipeline():
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE

    if StableDiffusionPipeline is None or torch is None:
        return None

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    _PIPELINE = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype
    )
    _PIPELINE = _PIPELINE.to(device)

    return _PIPELINE


def generate_panel_images(story, data):
    pipeline = get_pipeline()

    if pipeline is None:
        return [
            _placeholder_png(panel["image_prompt"])
            for panel in story["panels"]
        ]

    images = []
    for panel in story["panels"]:
        prompt = (
            panel["image_prompt"]
            + ", high quality, coherent comic panel, detailed illustration, "
              "no words, no letters, no watermark"
        )
        result = pipeline(
            prompt,
            num_inference_steps=int(os.getenv("SD_STEPS", "20")),
            guidance_scale=float(os.getenv("SD_GUIDANCE", "7.5"))
        )
        image = result.images[0]
        output = BytesIO()
        image.save(output, format="PNG")
        images.append(output.getvalue())

    return images
