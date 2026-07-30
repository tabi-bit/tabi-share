"""Generate FCM notification icons (SVG + PNG 192x192).

Sources:
- Transportation / paper-plane: extracted from `frontend/src/assets/icons/*.svg` (Font Awesome)
- Schedule (pin): Lucide `MapPin` (outlined) inlined at 640x640

All icons share the orange rounded-square badge and a white foreground.
"""

from __future__ import annotations

import re
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "frontend/src/assets/icons"
OUT_DIR = ROOT / "frontend/public/icons/notify"
OUT_DIR.mkdir(parents=True, exist_ok=True)

ACCENT = "#f4a261"
FG = "#ffffff"

# 円形マスク (Android / iOS の PWA badge) にトリミングされても四隅に切れ目が出ないよう、
# 背景は全画角を塗る。角丸は表示側に任せる (ホームスクリーン等では OS が自動でマスクする)。
BADGE_RECT = f'<rect x="0" y="0" width="640" height="640" fill="{ACCENT}"/>'

# 丸く切り抜かれる (Android の circular mask 等) のを見越して、前景は 480×480 中央配置に縮小。
# 640 → 480 = 0.75x, オフセット (640-480)/2 = 80。
FG_SCALE = 0.75
FG_OFFSET = (640 - int(640 * FG_SCALE)) // 2


def _extract_fa_paths(src_svg_path: Path) -> str:
    """Return the inner content of the FA SVG (all <path .../> elements)."""
    text = src_svg_path.read_text(encoding="utf-8")
    inner = re.sub(r"^.*?<svg[^>]*>", "", text, count=1, flags=re.DOTALL)
    inner = re.sub(r"</svg>\s*$", "", inner, count=1, flags=re.DOTALL)
    inner = re.sub(r"<!--.*?-->", "", inner, flags=re.DOTALL)
    # 明示された fill/stroke 属性 (shinkansen 等の "black" 指定) は白に置換。
    # fill が無い path はデフォルト black になるため、外側の <g fill="#fff"> で継承させる。
    inner = re.sub(r'fill="[^"]*"', f'fill="{FG}"', inner)
    inner = re.sub(r'stroke="[^"]*"', f'stroke="{FG}"', inner)
    return inner.strip()


def _wrap_fa(fg_inner: str) -> str:
    """Center + scale FA foreground inside the badge, with white inherited fill."""
    return (
        f'<g transform="translate({FG_OFFSET} {FG_OFFSET}) scale({FG_SCALE})" '
        f'fill="{FG}">'
        f"{fg_inner}"
        f"</g>"
    )


# Lucide MapPin (24x24 viewBox, outlined). We render it as a nested <svg> so we don't need to rescale coords.
LUCIDE_MAPPIN_INNER = """
<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
<circle cx="12" cy="10" r="3"/>
""".strip()

# Lucide MapPin: 24x24 native viewBox。FA と同じ 480x480 (scale 0.75) の枠に収める。
LUCIDE_NESTED = f"""
<svg x="{FG_OFFSET}" y="{FG_OFFSET}" width="{int(640 * FG_SCALE)}" height="{int(640 * FG_SCALE)}"
     viewBox="0 0 24 24"
     fill="none" stroke="{FG}" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round">
  {LUCIDE_MAPPIN_INNER}
</svg>
""".strip()


def build_svg(foreground_inner: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="192" height="192">\n'
        f"  {BADGE_RECT}\n"
        f"  {foreground_inner}\n"
        "</svg>\n"
    )


# Mapping from output-name → FA source basename (or Lucide sentinel).
ICON_SOURCES: dict[str, str] = {
    "schedule": "__lucide_mappin__",   # event/stay 共通
    "car": "car",
    "bus": "bus",
    "train": "train",
    "shinkansen": "shinkansen",
    "ship": "ship",
    "flight": "plane",
    "bicycle": "bicycle",
    "walk": "person-walking",
    "test": "paper-plane",
}


# Android 通知ステータスバーに出る小アイコン用の badge。透過背景 + モノクロシルエット。
# OS 側でアクセントカラーへリカラーされるので、単色 (白) の紙飛行機を配置するだけ。
BADGE_SVG = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="96" height="96">
  <g transform="translate({FG_OFFSET} {FG_OFFSET}) scale({FG_SCALE})" fill="#ffffff">
    <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z"/>
  </g>
</svg>
"""


def main() -> None:
    for out_name, source in ICON_SOURCES.items():
        if source == "__lucide_mappin__":
            fg = LUCIDE_NESTED
        else:
            fg = _wrap_fa(_extract_fa_paths(SRC_DIR / f"{source}.svg"))
        svg = build_svg(fg)
        (OUT_DIR / f"{out_name}.svg").write_text(svg, encoding="utf-8")
        cairosvg.svg2png(
            bytestring=svg.encode("utf-8"),
            write_to=str(OUT_DIR / f"{out_name}.png"),
            output_width=192,
            output_height=192,
        )
        print(f"generated: {out_name}.svg + {out_name}.png (source: {source})")

    # Badge: 透過背景 + 白紙飛行機 (Android status bar 用)
    (OUT_DIR / "badge.svg").write_text(BADGE_SVG, encoding="utf-8")
    cairosvg.svg2png(
        bytestring=BADGE_SVG.encode("utf-8"),
        write_to=str(OUT_DIR / "badge.png"),
        output_width=96,
        output_height=96,
    )
    print("generated: badge.svg + badge.png (transparent + paper-plane silhouette)")


if __name__ == "__main__":
    main()
