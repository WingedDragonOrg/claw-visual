#!/usr/bin/env python3
"""
Generate agent spritesheet using Jimeng AI API via mcporter.

Usage:
  python3 generate_jimeng_spritesheet.py <agent_key> "<prompt>" [output_path]

The script generates 3 images (one per animation state), resizes each to 64x64,
and tiles them into a 256x192 spritesheet (4 cols x 3 rows).
Row 0 = idle, Row 1 = work, Row 2 = sleep/error
"""
import subprocess
import urllib.request
import os
import sys
from io import BytesIO
from PIL import Image

OUT_DIR = "/home/ubuntu/claw-visual/packages/web/public/sprites"
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
    env["NVM_DIR"] = "/home/ubuntu/.nvm"
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
    Each source image = one animation state (idle/work/sleep), resized to 64x64.
    Row 0 (idle): frames[0] tiled 4x
    Row 1 (work): frames[1] tiled 4x
    Row 2 (sleep): frames[2] tiled 4x
    """
    result = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))

    # Resize each source to 64x64 (single frame)
    frames = [img.resize((FRAME_W, FRAME_H), Image.LANCZOS) for img in images]
    while len(frames) < 3:
        frames.append(frames[-1] if frames else Image.new("RGBA", (FRAME_W, FRAME_H), (0, 0, 0, 0)))

    for row_idx in range(ROWS):
        frame = frames[row_idx]
        for col in range(COLS):
            result.paste(frame, (col * FRAME_W, row_idx * FRAME_H))

    result.save(output_path)
    print(f"Saved: {output_path} ({result.size})")


def main():
    if len(sys.argv) < 3:
        agent_key = "xiaoai"
        prompt = (
            "pixel art chibi AI agent character, solid sky blue background #87CEEB, "
            "limited color palette NES style, crisp pixel edges"
        )
    else:
        agent_key = sys.argv[1]
        prompt = sys.argv[2]

    output_path = sys.argv[3] if len(sys.argv) > 3 else f"{OUT_DIR}/agent-{agent_key}_ai.png"

    print(f"=== Generating spritesheet for: {agent_key} ===")
    print(f"Output: {output_path}")

    # Generate 3 images for 3 states
    state_prompts = [
        f"{prompt} - idle pose, standing forward, friendly neutral expression",
        f"{prompt} - working pose, hands on keyboard, focused expression",
        f"{prompt} - resting or sleeping pose, eyes closed, calm relaxed expression",
    ]

    images = []
    for i, sp in enumerate(state_prompts):
        print(f"  State {i+1}/3: {sp[:70]}...")
        urls = call_jimeng(sp)
        if urls:
            try:
                images.append(download_image(urls[0]))
            except Exception as e:
                print(f"    Download failed: {e}", file=sys.stderr)

    if not images:
        print("No images downloaded.", file=sys.stderr)
        sys.exit(1)

    make_spritesheet(images, output_path)
    print("=== Done ===")


if __name__ == "__main__":
    main()
