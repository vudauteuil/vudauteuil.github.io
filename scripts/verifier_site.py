"""Vérifie le site construit (_site) avant sa mise en ligne.

Lancé automatiquement par GitHub (.github/workflows/site.yml). S'il manque
une page essentielle ou l'image de partage d'une brève, la mise en ligne
s'arrête et le site en ligne reste tel qu'il était.
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "_site"
ESSENTIELS = [
    "index.html",
    "sitemap.xml",
    "robots.txt",
    "feed.xml",
    "breves/index.html",
    "epopee/index.html",
    "barometre/index.html",
    "tifos/index.html",
    "lexique/index.html",
    "premiere-fois-au-virage/index.html",
    "assets/partage/vu-dauteuil.png",
]


def texte(chemin: Path) -> str:
    return chemin.read_text(encoding="utf-8")


def meta(page: str, nom: str) -> str:
    m = re.search(rf'<meta (?:property|name)="{re.escape(nom)}" content="([^"]*)"', page)
    return html.unescape(m.group(1)) if m else "(absent)"


def visible(page: str, debut: str, fin: str) -> str:
    bloc = page.split(debut, 1)[-1].split(fin, 1)[0]
    bloc = re.sub(r"<script.*?</script>", " ", bloc, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", bloc))).strip()


def main() -> int:
    erreurs = []
    for f in ESSENTIELS:
        if not (SITE / f).is_file():
            erreurs.append(f"Page ou fichier manquant : {f}")

    breves = sorted(SITE.glob("breves/*/*/*/*/index.html"))
    print(f"{len(breves)} brève(s) construite(s)")
    for b in breves:
        page = texte(b)
        image = meta(page, "og:image")
        print(f"- {b.parent.relative_to(SITE)} : {meta(page, 'twitter:card')} · {image}")
        if "/assets/partage/" not in image:
            erreurs.append(f"Pas d'image de partage pour {b.parent.relative_to(SITE)}")
        elif "vu-dauteuil.png" not in image:
            nom = image.split("/assets/partage/", 1)[1]
            if not (SITE / "assets" / "partage" / nom).is_file():
                erreurs.append(f"Image de partage introuvable : {nom}")

    accueil = SITE / "index.html"
    if accueil.is_file():
        print(f"Accueil : {meta(texte(accueil), 'twitter:card')} · {meta(texte(accueil), 'og:image')}")
    baro = SITE / "barometre" / "index.html"
    if baro.is_file():
        print("Baromètre :", visible(texte(baro), "<main", "</main>")[:900])
    lex = SITE / "lexique" / "index.html"
    if lex.is_file():
        ancres = re.findall(r'<div class="mot" id="([^"]+)"', texte(lex))
        print(f"Lexique : {len(ancres)} mots ·", " ".join(ancres))
    flux = SITE / "feed.xml"
    if flux.is_file():
        print("Flux RSS, auteur :", re.findall(r"<author>\s*<name>([^<]*)</name>", texte(flux))[:1])
    plan = SITE / "sitemap.xml"
    if plan.is_file():
        print("Plan du site :", " ".join(re.findall(r"<loc>([^<]+)</loc>", texte(plan))))

    for e in erreurs:
        print("ERREUR :", e)
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
