"""I update displayed code steps from their notebook sources.

Run this from the website checkout after editing a notebook:
python files/mesoscale/examples/stepwise/build_lessons.py
This also rebuilds both downloadable teaching archives.
"""
from pathlib import Path
import html
import base64
import json
import zipfile

ROOT = Path(__file__).resolve().parents[4]
EXAMPLES = ROOT / "files/mesoscale/examples"


def read_steps(notebook_path):
    notebook = json.loads(notebook_path.read_text())
    steps = []
    explanation = None
    for cell in notebook["cells"]:
        source = cell["source"]
        if isinstance(source, list):
            source = "".join(source)
        if cell["cell_type"] == "markdown" and source.startswith("## "):
            explanation = source
        elif cell["cell_type"] == "code" and explanation is not None:
            title, _, text = explanation.partition("\n\n")
            steps.append((title[3:], text, source, cell.get("outputs", [])))
            explanation = None
    return steps


def update_page(page_name, python_path, julia_path=None):
    python_steps = read_steps(python_path)
    julia_steps = read_steps(julia_path) if julia_path else None
    if julia_steps is not None and len(julia_steps) != len(python_steps):
        raise ValueError("Python and Julia must have the same step count.")
    blocks = []
    for index, (title, text, code, outputs) in enumerate(python_steps):
        blocks.append("<h2>" + html.escape(title) + "</h2>")
        blocks.append("<p>" + html.escape(text) + "</p>")
        blocks.append("<h3>Python</h3><pre><code>" + html.escape(code) + "</code></pre>")
        if julia_steps is not None:
            julia_code = julia_steps[index][2]
            blocks.append("<details><summary>The same part in Julia</summary><pre><code>" +
                          html.escape(julia_code) + "</code></pre></details>")
        for output in outputs:
            image = output.get("data", {}).get("image/png")
            if image is not None:
                if isinstance(image, list):
                    image = "".join(image)
                image_name = python_path.stem + "-step-" + str(index + 1) + ".png"
                folder = ROOT / "assets/images/stepwise"
                folder.mkdir(parents=True, exist_ok=True)
                (folder / image_name).write_bytes(base64.b64decode(image))
                blocks.append('<figure><img loading="lazy" src="/assets/images/stepwise/' +
                              image_name + '" alt="Checked result: ' + html.escape(title) +
                              '"><figcaption>Result from the executed Python notebook.</figcaption></figure>')
    page = ROOT / "_pages" / page_name
    before, rest = page.read_text().split("<!-- CODE-STEPS-START -->", 1)
    _, after = rest.split("<!-- CODE-STEPS-END -->", 1)
    page.write_text(before + "<!-- CODE-STEPS-START -->" + "\n".join(blocks) +
                    "<!-- CODE-STEPS-END -->" + after)
    print("Updated", page.name)


if __name__ == "__main__":
    for name in ["diffusion", "walkers", "phase-field", "monte-carlo"]:
        update_page("code-" + name + ".html",
                    EXAMPLES / "stepwise" / (name + "-python.ipynb"),
                    EXAMPLES / "stepwise" / (name + "-julia.ipynb"))
    update_page("hoshen-kopelman.html",
                EXAMPLES / "hoshen-kopelman/hoshen-kopelman-python.ipynb",
                EXAMPLES / "hoshen-kopelman/hoshen-kopelman-julia.ipynb")
    update_page("structure-correlation.html",
                EXAMPLES / "stepwise/structure-correlation-python.ipynb")

    archive = EXAMPLES / "step-by-step-teaching-codes.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        for folder in [EXAMPLES / "stepwise", EXAMPLES / "hoshen-kopelman"]:
            for source in sorted(folder.rglob("*")):
                if not source.is_file() or "__pycache__" in source.parts:
                    continue
                if source.suffix == ".zip" or source.name == "build_lessons.py":
                    continue
                bundle.write(source, "examples/" + str(source.relative_to(EXAMPLES)))
        for name in ["phase_field.py", "phase_field.jl", "LICENSE-CODE-MIT.txt", "LICENSING.md"]:
            bundle.write(EXAMPLES / name, "examples/" + name)
    hk = EXAMPLES / "hoshen-kopelman"
    with zipfile.ZipFile(hk / "stepwise-hoshen-kopelman.zip", "w", zipfile.ZIP_DEFLATED) as bundle:
        for source in sorted(hk.iterdir()):
            if source.is_file() and source.suffix != ".zip":
                bundle.write(source, source.name)
        bundle.write(EXAMPLES / "LICENSE-CODE-MIT.txt", "LICENSE-CODE-MIT.txt")
    print("Updated both download archives.")
