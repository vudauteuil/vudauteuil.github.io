"""Vérifie le site construit (_site) avant sa mise en ligne.

Lancé automatiquement par GitHub (.github/workflows/site.yml). S'il manque
une page essentielle ou l'image de partage d'une brève, la mise en ligne
s'arrête et le site en ligne reste tel qu'il était.
"""

from __future__ import annotations

import html
import json
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
    "chants/index.html",
    "premiere-fois-au-virage/index.html",
    "assets/partage/vu-dauteuil.png",
    "favicon.ico",
    "assets/icones/favicon.svg",
    "assets/icones/favicon-192.png",
    "assets/icones/apple-touch-icon.png",
]
MENU = [
    "/breves/",
    "/epopee/",
    "/barometre/",
    "/tifos/",
    "/lexique/",
    "/chants/",
    "/premiere-fois-au-virage/",
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
        # Les définitions du lexique, pour la bulle des mots surlignés.
        donnees = re.search(r'<script type="application/json" id="lexique-donnees">(.*?)</script>', page, flags=re.S)
        if not donnees:
            erreurs.append(f"Définitions du lexique absentes de {b.parent.relative_to(SITE)}")
        else:
            try:
                lexique = json.loads(donnees.group(1))
            except ValueError as e:
                erreurs.append(f"Définitions du lexique illisibles sur {b.parent.relative_to(SITE)} : {e}")
            else:
                liens = re.findall(r'href="/lexique/#([^"]+)"', page.split('class="corps"', 1)[-1])
                manquants = sorted({a for a in liens if a not in lexique})
                print(f"  lexique : {len(lexique)} définitions, {len(liens)} mot(s) surligné(s)")
                if manquants:
                    # Simple avertissement : le lien mène quand même à la page du lexique.
                    print(f"  attention, mots absents du lexique : {', '.join(manquants)}")

    accueil = SITE / "index.html"
    if accueil.is_file():
        print(f"Accueil : {meta(texte(accueil), 'twitter:card')} · {meta(texte(accueil), 'og:image')}")
        icones = re.findall(r'<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"', texte(accueil))
        print("Icônes déclarées :", " · ".join(icones))
        for ic in icones:
            if not (SITE / ic.lstrip("/")).is_file():
                erreurs.append(f"Icône déclarée mais absente : {ic}")
        if "/assets/icones/favicon-192.png" not in icones:
            erreurs.append("L'icône PNG lue par Google n'est pas déclarée sur l'accueil")
    baro = SITE / "barometre" / "index.html"
    if baro.is_file():
        print("Baromètre :", visible(texte(baro), "<main", "</main>")[:900])
    lex = SITE / "lexique" / "index.html"
    if lex.is_file():
        ancres = re.findall(r'<div class="mot" id="([^"]+)"', texte(lex))
        print(f"Lexique : {len(ancres)} mots ·", " ".join(ancres))
    chants = SITE / "chants" / "index.html"
    if chants.is_file():
        ancres = re.findall(r'<article class="chant" id="([^"]+)"', texte(chants))
        print(f"Chants : {len(ancres)} chants ·", " ".join(ancres))

    # Le menu : chaque rubrique ouvre sa propre page, soulignée quand on y est.
    for rubrique in MENU:
        f = SITE / rubrique.strip("/") / "index.html"
        if not f.is_file():
            continue
        page = texte(f)
        nav = page.split('aria-label="Navigation principale"', 1)[-1].split("</nav>", 1)[0]
        if re.search(r'href="[^"]*/#', nav):
            erreurs.append(f"Le menu de {rubrique} renvoie encore vers l'accueil")
        if not re.search(rf'href="{re.escape(rubrique)}" aria-current="page"', nav):
            erreurs.append(f"La rubrique {rubrique} n'est pas soulignée sur sa propre page")
        titre = re.search(r"<h1[^>]*>(.*?)</h1>", page, flags=re.S)
        print(f"Page {rubrique} :", html.unescape(re.sub(r"<[^>]+>", "", titre.group(1))).strip() if titre else "(sans titre)")

    # L'accueil montre un extrait de chaque rubrique, avec un lien vers sa page.
    if accueil.is_file():
        corps = texte(accueil).split('id="contenu"', 1)[-1].split("</main>", 1)[0]
        for rubrique in ["/breves/", "/epopee/", "/tifos/", "/lexique/", "/chants/"]:
            if f'href="{rubrique}"' not in corps:
                erreurs.append(f"L'accueil ne renvoie pas vers la page {rubrique}")
        liens = re.findall(r'<a class="billet-lien" href="(/[a-z-]+/)">([^<]+)</a>', corps)
        print("Accueil, liens vers les pages :", " · ".join(f"{html.unescape(t).strip()} ({u})" for u, t in liens))

    flux = SITE / "feed.xml"
    if flux.is_file():
        print("Flux RSS, auteur :", re.findall(r"<author>\s*<name>([^<]*)</name>", texte(flux))[:1])
    plan = SITE / "sitemap.xml"
    if plan.is_file():
        print("Plan du site :", " ".join(re.findall(r"<loc>([^<]+)</loc>", texte(plan))))

    # Aucune instruction de mise en page ne doit apparaître en clair sur le site.
    fuites = re.compile(r"« include |\{%|%\}|\{\{|\}\}")
    for f in sorted(SITE.rglob("*.html")):
        corps = re.sub(r"<(script|style).*?</\1>", " ", texte(f), flags=re.S)
        for m in fuites.finditer(corps):
            extrait = corps[max(0, m.start() - 40):m.end() + 40].replace("\n", " ")
            erreurs.append(f"Code visible sur {f.relative_to(SITE)} : …{extrait}…")
            break
    for f, motif in [("index.html", r'<span class="lb-score">([^<]*)</span>\s*<span class="lb-date">([^<]*)</span>'),
                     ("epopee/index.html", r'<span class="episode-match">([^<]*)</span>')]:
        if (SITE / f).is_file():
            print(f"Scores sur {f} :", re.findall(motif, texte(SITE / f))[:3])

    for e in erreurs:
        print("ERREUR :", e)
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
