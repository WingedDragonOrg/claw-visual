#!/usr/bin/env python3
"""
Generate a placeholder spritesheet from emoji for an agent.
Output: 256x192 PNG (64x64 per frame, 4 cols x 3 rows)
Row 0: idle (4 frames)
Row 1: work (4 frames)
Row 2: sleep (2 frames) + error (2 frames)
"""
import sys
from PIL import Image, ImageDraw, ImageFont

OUTPUT_PATH = sys.argv[1] if len(sys.argv) > 1 else "agent-placeholder.png"
EMOJI = sys.argv[2] if len(sys.argv) > 2 else "🤖"

FRAME_W = 64
FRAME_H = 64
COLS = 4
ROWS = 3
SPRITE_W = COLS * FRAME_W  # 256
SPRITE_H = ROWS * FRAME_H  # 192

# Colors for background circles (per status)
BG_COLORS = {
    'idle':  (30,  144,  255),   # dodger blue
    'work':  (50,  205,  50),    # lime green
    'sleep': (138, 43,  226),     # blue violet
    'error': (255, 69,  0),      # red orange
}

def draw_emoji_centered(draw, x, y, emoji, size=48):
    """Draw emoji centered at (x,y)"""
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
        except Exception:
            font = ImageFont.load_default()
    # Use textbbox for centering
    bbox = draw.textbbox((0, 0), emoji, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text((x - text_w // 2, y - text_h // 2), emoji, font=font)

def generate_spritesheet(emoji, output_path):
    img = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    states = ['idle', 'work', 'sleep', 'error']
    frames = [4, 4, 2, 2]  # frames per state

    for row_idx, (state, count) in enumerate(zip(states, frames)):
        color = BG_COLORS[state]
        for col in range(COLS):
            fx = col * FRAME_W
            fy = row_idx * FRAME_H
            frame_num = col if col < count else count - 1  # repeat last frame if fewer

            # Draw circle background
            cx, cy = fx + FRAME_W // 2, fy + FRAME_H // 2
            r = 28
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

            # Animate slightly: shift Y for walk frames
            offset_y = 0
            if state == 'work' and col > 0:
                offset_y = -col * 2  # slight bob
            elif state == 'sleep':
                offset_y = col * 1
            elif state == 'error':
                offset_y = (col % 2) * 3 - 1  # slight shake

            draw_emoji_centered(draw, cx, cy + offset_y, emoji, size=44)

            # Status label (small)
            try:
                font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 8)
            except Exception:
                font_sm = ImageFont.load_default()
            label = f"{state[0].upper()}{frame_num}"
            draw.text((fx + 2, fy + FRAME_H - 10), label, font=font_sm, fill=(255, 255, 255, 180))

    img.save(output_path)
    print(f"Saved: {output_path} ({SPRITE_W}x{SPRITE_H})")

if __name__ == "__main__":
    generate_spritesheet(EMOJI, OUTPUT_PATH)
