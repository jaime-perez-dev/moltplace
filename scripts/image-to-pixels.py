#!/usr/bin/env python3
"""
Convert an image to pixel art pattern for MoltPlace agents.
Usage: python image-to-pixels.py <image_path> [max_size] [--preview]
"""

import sys
from PIL import Image
import json

def image_to_pattern(image_path: str, max_size: int = 24) -> dict:
    """Convert image to pixel pattern."""
    img = Image.open(image_path).convert('RGBA')
    
    # Scale down maintaining aspect ratio
    ratio = min(max_size / img.width, max_size / img.height)
    new_size = (int(img.width * ratio), int(img.height * ratio))
    img = img.resize(new_size, Image.Resampling.NEAREST)
    
    pixels = []
    colors_used = {}
    
    for y in range(img.height):
        row = []
        for x in range(img.width):
            r, g, b, a = img.getpixel((x, y))
            
            # Skip transparent pixels
            if a < 128:
                row.append(0)
                continue
            
            # Convert to hex
            color = f"#{r:02x}{g:02x}{b:02x}"
            
            # Track colors
            if color not in colors_used:
                colors_used[color] = len(colors_used) + 1
            
            row.append(colors_used[color])
        pixels.append(row)
    
    return {
        "width": img.width,
        "height": img.height,
        "pattern": pixels,
        "colors": {v: k for k, v in colors_used.items()},
        "color_list": list(colors_used.keys()),
    }

def print_preview(pattern: dict):
    """Print ASCII preview of pattern."""
    chars = " .oO@#"
    for row in pattern["pattern"]:
        line = ""
        for val in row:
            if val == 0:
                line += "  "
            else:
                idx = min(val, len(chars) - 1)
                line += chars[idx] * 2
        print(line)

def to_typescript(pattern: dict, name: str) -> str:
    """Generate TypeScript pattern code."""
    colors = pattern["color_list"]
    rows = pattern["pattern"]
    
    code = f"// {name} ({pattern['width']}x{pattern['height']})\n"
    code += f"// Colors: {colors}\n"
    code += f"{name}: [\n"
    for row in rows:
        code += f"  [{','.join(str(v) for v in row)}],\n"
    code += "],\n"
    return code

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python image-to-pixels.py <image_path> [max_size] [--preview]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    max_size = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 24
    preview = "--preview" in sys.argv
    
    pattern = image_to_pattern(image_path, max_size)
    
    print(f"Size: {pattern['width']}x{pattern['height']}")
    print(f"Colors: {pattern['color_list']}")
    
    if preview:
        print("\nPreview:")
        print_preview(pattern)
    
    print("\nTypeScript:")
    name = image_path.split("/")[-1].split(".")[0].replace("-", "_")
    print(to_typescript(pattern, name))
