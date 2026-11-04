"""Construit les versions distribuables de l'app.

dist/room-defense-coach.html : une seule page, tout intégré (CSS, JS), sans
  service worker. Pour l'ouvrir partout ou la publier comme page.
dist/room-defense-coach-pwa.zip : le dossier complet (manifest, icônes, cache
  hors ligne) à déposer sur un hébergement HTTPS pour l'installer sur iPhone.

Usage : python3 outils/build.py [--fragment]
  --fragment : sans <!doctype>/<head>/<body>, pour un hôte qui ajoute le squelette.
"""
import re
import sys
import zipfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DIST = RACINE / "dist"
MODULES = ["js/data.js", "js/engine.js", "js/store.js", "js/capture.js", "js/ocr.js", "js/app.js"]
PWA = ["index.html", "styles.css", "manifest.webmanifest", "sw.js", "icon.svg",
       "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", *MODULES,
       *[str(p.relative_to(RACINE)) for d in ("vendor", "assets") for p in sorted((RACINE / d).rglob("*")) if p.is_file()]]


def bundle_js():
    morceaux, vus = [], {}
    for f in MODULES:
        s = (RACINE / f).read_text(encoding="utf-8")
        s = re.sub(r'^import[\s\S]*?from\s+"[^"]+";\n', "", s, flags=re.M)
        s = re.sub(r"^export \{[^}]*\};\n", "", s, flags=re.M)
        s = re.sub(r"^export (async function|const|function|let)", r"\1", s, flags=re.M)
        if re.search(r"^\s*(import\s[^:]*\bfrom\b|export\s)", s, flags=re.M):
            sys.exit(f"import/export restant dans {f}")
        morceaux.append(f"// ---- {f} ----\n{s}")
        for nom in re.findall(r"^(?:const|let|function|async function|class)\s+([A-Za-z_$][\w$]*)", s, flags=re.M):
            if nom in vus:
                sys.exit(f"Nom déclaré deux fois une fois les modules réunis : {nom} ({vus[nom]} et {f})")
            vus[nom] = f
    js = "\n".join(morceaux)
    # Pas de service worker dans la version une page.
    return re.sub(r'\nif \("serviceWorker" in navigator[\s\S]*?\n}\n', "\n", js)


def page_unique(fragment: bool) -> str:
    html = (RACINE / "index.html").read_text(encoding="utf-8")
    css = (RACINE / "styles.css").read_text(encoding="utf-8")
    corps = re.search(r"<body>([\s\S]*)</body>", html).group(1)
    corps = corps.replace('<script type="module" src="js/app.js"></script>', "")
    script = f'<script type="module">\n{bundle_js()}\n</script>'
    tete = ('<title>Knock Knock Manager</title>\n'
            '<meta name="description" content="Coach de progression pour Knock Knock: Room Defense">\n'
            f"<style>\n{css}\n</style>")
    if fragment:
        return f"{tete}\n{corps}\n{script}\n"
    metas = "\n".join(l for l in html.splitlines() if l.strip().startswith("<meta"))
    return (f'<!doctype html>\n<html lang="fr">\n<head>\n{metas}\n{tete}\n</head>\n'
            f"<body>\n{corps}\n{script}\n</body>\n</html>\n")


def main():
    fragment = "--fragment" in sys.argv
    DIST.mkdir(exist_ok=True)
    nom = "room-defense-coach-fragment.html" if fragment else "room-defense-coach.html"
    (DIST / nom).write_text(page_unique(fragment), encoding="utf-8")
    with zipfile.ZipFile(DIST / "room-defense-coach-pwa.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in PWA:
            z.write(RACINE / f, f)
    print(f"dist/{nom}\ndist/room-defense-coach-pwa.zip")


if __name__ == "__main__":
    main()
