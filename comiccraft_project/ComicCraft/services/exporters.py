from pathlib import Path
from io import BytesIO
from PIL import Image
from fpdf import FPDF


class ComicPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 15)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", size=8)
        self.cell(0, 10, f"ComicCraft - Page {self.page_no()}", align="C")


def safe_text(value):
    value = str(value or "")
    return value.encode("latin-1", "replace").decode("latin-1")


def build_comic_pdf(title, panels, generated_dir, output_path):
    pdf = ComicPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    for index, panel in enumerate(panels, start=1):
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 18)
        pdf.multi_cell(0, 10, safe_text(title))
        pdf.ln(3)

        pdf.set_font("Helvetica", "B", 13)
        pdf.multi_cell(0, 8, safe_text(f"Panel {index}: {panel.get('title', '')}"))
        pdf.ln(3)

        image_url = panel.get("image_url", "")
        filename = image_url.split("/")[-1]
        image_path = generated_dir / filename

        if image_path.exists():
            with Image.open(image_path) as img:
                img_copy = img.convert("RGB")
                temp_path = generated_dir / f"_pdf_{filename}.jpg"
                img_copy.save(temp_path, "JPEG", quality=90)
            pdf.image(str(temp_path), x=15, y=55, w=180)
            try:
                temp_path.unlink()
            except OSError:
                pass
            pdf.ln(120)

        pdf.set_font("Helvetica", size=11)
        pdf.multi_cell(0, 7, safe_text(panel.get("narration", "")))
        pdf.ln(3)

        pdf.set_font("Helvetica", "I", size=11)
        pdf.multi_cell(0, 7, safe_text(panel.get("dialogue", "")))

    pdf.output(str(output_path))
