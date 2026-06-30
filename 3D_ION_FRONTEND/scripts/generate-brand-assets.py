"""Generate AMRAD favicon and app icons from the source ICO or logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"
PUBLIC = ROOT / "public"
ICO_SOURCE = ROOT / "scripts" / "brand" / "amrad-icon.ico"
LOGO_SOURCE = ROOT / "logo_amrad.png"


def main() -> None:
    if not ICO_SOURCE.exists():
        raise SystemExit(f"Missing source icon: {ICO_SOURCE}")

    ico = Image.open(ICO_SOURCE).convert("RGBA")
    ico.save(APP / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    for name, size in [("icon.png", 512), ("apple-icon.png", 180)]:
        ico.resize((size, size), Image.Resampling.LANCZOS).save(APP / name, format="PNG")

    ico.resize((256, 256), Image.Resampling.LANCZOS).save(PUBLIC / "icone.png", format="PNG")

    if LOGO_SOURCE.exists():
        Image.open(LOGO_SOURCE).save(PUBLIC / "logo_amrad.png", format="PNG")

    print("AMRAD brand assets generated.")


if __name__ == "__main__":
    main()
