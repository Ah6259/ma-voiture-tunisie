"""Icône du site « Ma voiture Tunisie » — même famille que les autres sites d'Ahmed : un symbole fort en aplats
2-3 tons + accent doré #F2B33D, sans texte ni brillance. L'avant d'une voiture + une pastille dorée (le rappel).
  python tools/icone.py   → assets/logo.svg, assets/icons/*.png, assets/apple-touch-icon.png, favicon.ico
Rendu avec Edge sans écran (comme « icones des sites - generateur.py »)."""
import os, subprocess, sys
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
EDGE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"  # Chrome : Edge sans écran ne rend plus d'image sur ce PC
GOLD, GOLD_D = "#F2B33D", "#D9952A"
FOND = ("#4A5FC4", "#232F73")

GLYPHE = f"""
<g>
  <!-- carrosserie (avant de la voiture) -->
  <path d="M150 214 L184 136 Q192 118 212 118 H300 Q320 118 328 136 L362 214Z" fill="#DCE3FA"/>
  <path d="M172 214 L198 150 Q203 140 214 140 H298 Q309 140 314 150 L340 214Z" fill="#2B3A8C"/>
  <rect x="104" y="206" width="304" height="132" rx="40" fill="#FFFFFF"/>
  <path d="M256 206 H368 Q408 206 408 246 V298 Q408 338 368 338 H256Z" fill="#E4E9FB"/>
  <!-- phares dorés -->
  <circle cx="160" cy="262" r="24" fill="{GOLD}"/>
  <circle cx="352" cy="262" r="24" fill="{GOLD_D}"/>
  <!-- calandre -->
  <rect x="214" y="294" width="84" height="20" rx="10" fill="#2B3A8C"/>
  <!-- roues -->
  <rect x="128" y="330" width="62" height="54" rx="16" fill="#1A2357"/>
  <rect x="322" y="330" width="62" height="54" rx="16" fill="#1A2357"/>
</g>
<!-- pastille dorée : le rappel (cloche) -->
<g transform="translate(352 92)">
  <circle r="62" fill="{GOLD}"/>
  <path d="M0 62 A62 62 0 0 0 62 0 H0Z" fill="{GOLD_D}"/>
  <path d="M-24 14 Q-24 -26 0 -28 Q24 -26 24 14 L30 22 H-30Z" fill="#FFFFFF"/>
  <circle cx="0" cy="30" r="8" fill="#FFFFFF"/>
</g>"""


def svg(mode):
    defs = f'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{FOND[0]}"/><stop offset="1" stop-color="{FOND[1]}"/></linearGradient>'
    if mode == "rounded":
        corps = f'<rect width="512" height="512" rx="112" fill="url(#bg)"/><g transform="translate(0 24)">{GLYPHE}</g>'
    else:  # carré plein, symbole réduit dans la zone sûre des icônes adaptatives (Android)
        corps = f'<rect width="512" height="512" fill="url(#bg)"/><g transform="translate(256 268) scale(.74) translate(-256 -256)">{GLYPHE}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>{defs}</defs>{corps}</svg>'


def rendre(texte, png, taille=1024):
    html = os.path.splitext(png)[0] + "_r.html"
    open(html, "w", encoding="utf-8").write('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden}svg{width:%dpx;height:%dpx;display:block}</style></head><body>%s</body></html>' % (taille, taille, texte))
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                    f"--window-size={taille},{taille}", f"--screenshot={png}", "file:///" + html.replace("\\", "/")],
                   check=True, capture_output=True, timeout=90)
    os.remove(html)
    Image.open(png).convert("RGBA").crop((0, 0, taille, taille)).save(png)


if __name__ == "__main__":
    a = os.path.join(RACINE, "assets"); ic = os.path.join(a, "icons"); os.makedirs(ic, exist_ok=True)
    open(os.path.join(a, "logo.svg"), "w", encoding="utf-8", newline="\n").write(svg("rounded"))
    tmp = os.path.join(ICI, "_icone")
    os.makedirs(tmp, exist_ok=True)
    r, p = os.path.join(tmp, "r.png"), os.path.join(tmp, "p.png")
    rendre(svg("rounded"), r); rendre(svg("full"), p)
    R, P = Image.open(r), Image.open(p)
    R.resize((192, 192), Image.LANCZOS).save(os.path.join(ic, "icon-192.png"), optimize=True)
    R.resize((512, 512), Image.LANCZOS).save(os.path.join(ic, "icon-512.png"), optimize=True)
    P.resize((512, 512), Image.LANCZOS).save(os.path.join(ic, "icon-maskable-512.png"), optimize=True)
    P.convert("RGB").resize((180, 180), Image.LANCZOS).save(os.path.join(a, "apple-touch-icon.png"), optimize=True)
    R.resize((64, 64), Image.LANCZOS).save(os.path.join(RACINE, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    R.resize((240, 240), Image.LANCZOS).save(os.path.join(tmp, "apercu.png"))
    print("ok", tmp)
