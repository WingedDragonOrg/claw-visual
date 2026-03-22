#!/usr/bin/env python3
"""
Generate agent spritesheet using Jimeng AI API via mcporter.

Usage:
  python3 generate_jimeng_spritesheet.py <agent_key> "<prompt>" [output_path]

Examples:
  python3 generate_jimeng_spritesheet.py xiaoai "A cute pixel art chibi AI agent..."
"""
import subprocess
import urllib.request
import os
import sys
from io import BytesIO
from PIL import Image

OUT_DIR = "/home/ubuntu/claw-visual/packages/web/public/sprites"
MCPORTER_BIN = "/home/ubuntu/.local/share/pnpm/mcporter"
NODE_PATH = "/home/ubuntu/.local/share/pnpm/global/5/.pnpm/mcporter@0.7.3_hono@4.11.7/node_modules"
BUN_BIN = "/home/ubuntu/.bun/bin/bun"

TARGET_W, TARGET_H = 256, 192
FRAME_W, FRAME_H = 64, 64
COLS, ROWS = 4, 3


def call_jimeng(prompt: str, aspect_ratio: str = "3:2") -> list[str]:
    """Call jimeng.text_to_image and return list of image URLs."""
    call_str = f'jimeng.text_to_image(prompt: "{prompt}", aspect_ratio: "{aspect_ratio}")'
    cmd = [
        str(BUN_BIN),
        f"{NODE_PATH}/mcporter/dist/cli.js",
        "call",
        call_str,
        "--output", "text"
    ]
    env = os.environ.copy()
    env["NODE_PATH"] = NODE_PATH

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=env,
        timeout=120
    )

    if result.returncode != 0:
        print(f"STDOUT: {result.stdout}", file=sys.stderr)
        print(f"STDERR: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"mcporter call failed with code {result.returncode}")

    # Parse URLs from text output
    urls = []
    for line in result.stdout.split("\n"):
        line = line.strip()
        if line.startswith("http"):
            urls.append(line)

    print(f"Got {len(urls)} image URL(s)")
    return urls


def download_image(url: str) -> Image.Image:
    """Download image and return PIL Image."""
    print(f"  Downloading: {url[:80]}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    img = Image.open(BytesIO(data)).convert("RGBA")
    print(f"  Downloaded: {img.size} {img.mode}")
    return img


def make_spritesheet(images: list[Image.Image], output_path: str):
    """
    Combine up to 3 images into a 256x192 spritesheet (4 cols x 3 rows).

    Row 0 (idle):  image[0] — extract 4 horizontal 64x64 tiles
    Row 1 (work):  image[1] — same
    Row 2 (sleep): image[2] — same

    If fewer images available, pad with last image.
    """
    result = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))

    # Resize each source to 256x192
    resized = [img.resize((TARGET_W, TARGET_H), Image.LANCZOS) for img in images]
    # Pad to 3
    while len(resized) < 3:
        resized.append(resized[-1])

    for row_idx in range(ROWS):
        src = resized[row_idx]
        for col in range(COLS):
            tile = src.crop((col * FRAME_W, 0, (col + 1) * FRAME_W, FRAME_H))
            result.paste(tile, (col * FRAME_W, row_idx * FRAME_H))

    result.save(output_path)
    print(f"Saved: {output_path} ({result.size})")


def main():
    if len(sys.argv) < 3:
        agent_key = "xiaoai"
        prompt = (
            "A cute pixel art chibi AI agent avatar, 256x192 pixels total, "
            "64x64 per frame, 4 frames in a row, clean pixel art style, "
            "bright cheerful expression, simple clean background"
        )
    else:
        agent_key = sys.argv[1]
        prompt = sys.argv[2]

    output_path = sys.argv[3] if len(sys.argv) > 3 else f"{OUT_DIR}/agent-{agent_key}_ai.png"

    print(f"=== Generating spritesheet for: {agent_key} ===")
    print(f"Output: {output_path}")

    urls = call_jimeng(prompt)
    if not urls:
        print("No URLs returned, exiting.")
        sys.exit(1)

    images = []
    for i, url in enumerate(urls[:4]):
        try:
            images.append(download_image(url))
        except Exception as e:
            print(f"  Download failed for image {i}: {e}", file=sys.stderr)

    if not images:
        print("No images downloaded.", file=sys.stderr)
        sys.exit(1)

    make_spritesheet(images, output_path)
    print("=== Done ===")


if __name__ == "__main__":
    main()
