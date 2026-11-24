"""Images de partage de Vu d'Auteuil (1200 x 630 px).

Ce script fabrique l'image qui s'affiche quand on partage un lien du site
sur WhatsApp, X, Instagram ou Facebook :

- une image par brève, avec le titre, le score et la note du virage ;
- une image générale, pour l'accueil et les autres pages.

Il tourne tout seul sur GitHub à chaque mise en ligne (voir
.github/workflows/site.yml). Tu n'as rien à lancer toi-même.

Utilisation manuelle (pour tester) :
    python scripts/images_partage.py            # fabrique les images
    python scripts/images_partage.py --injecter # et les déclare dans les brèves
    python scripts/images_partage.py --generale # refait l'image générale

L'option --injecter ajoute une ligne « image: » en tête de chaque brève.
Elle ne sert que sur GitHub, au moment de construire le site : ces
modifications ne sont jamais enregistrées dans le dépôt.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import tempfile
from pathlib import Path

import yaml
from PIL import Image, ImageDraw, ImageFont, ImageOps

RACINE = Path(__file__).resolve().parent.parent
POLICES = RACINE / "assets" / "fonts"
SORTIE = RACINE / "assets" / "partage"
BREVES = RACINE / "_posts"
REGLAGES = RACINE / "_data" / "reglages.yml"

LARGEUR, HAUTEUR = 1200, 630
MARGE = 64

# Les couleurs du site (assets/css/style.css)
NUIT = "#0E1A33"
NUIT_2 = "#16264A"
NUIT_FONCE = "#0A1428"
FILET_NUIT = "#2A3A60"
ROUGE = "#C8102E"
ROUGE_VIF = "#E0313F"
BLANC = "#FFFFFF"
GRIS_CLAIR = "#A9B4C8"
TEXTE_NUIT = "#D5DAE5"
JAUNE = "#FFD34D"

_cache_polices: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}
_dossier_ttf = Path(tempfile.mkdtemp(prefix="polices-"))


def police(nom: str, taille: int) -> ImageFont.FreeTypeFont:
    """Charge une police du site. Convertit le woff2 en ttf si besoin."""
    cle = (nom, taille)
    if cle in _cache_polices:
        return _cache_polices[cle]
    source = POLICES / f"{nom}.woff2"
    try:
        f = ImageFont.truetype(str(source), taille)
    except OSError:
        from fontTools.ttLib import TTFont  # brotli requis pour le woff2

        ttf = _dossier_ttf / f"{nom}.ttf"
        if not ttf.exists():
            fonte = TTFont(str(source))
            fonte.flavor = None
            fonte.save(str(ttf))
        f = ImageFont.truetype(str(ttf), taille)
    _cache_polices[cle] = f
    return f


def anton(taille: int) -> ImageFont.FreeTypeFont:
    return police("anton-400", taille)


def barlow(taille: int, graisse: int = 600) -> ImageFont.FreeTypeFont:
    return police(f"barlow-condensed-{graisse}", taille)


def newsreader_italique(taille: int) -> ImageFont.FreeTypeFont:
    f = police("newsreader-italic-variable", taille)
    return f


def largeur_espacee(texte: str, f: ImageFont.FreeTypeFont, espacement: float) -> float:
    if not texte:
        return 0
    pas = f.size * espacement
    return sum(f.getlength(c) for c in texte) + pas * (len(texte) - 1)


def ecrire_espace(d: ImageDraw.ImageDraw, xy, texte, f, couleur, espacement=0.12, ancre="ls"):
    """Écrit un libellé en capitales avec un espacement entre les lettres."""
    x, y = xy
    pas = f.size * espacement
    for c in texte:
        d.text((x, y), c, font=f, fill=couleur, anchor=ancre)
        x += f.getlength(c) + pas
    return x


def logo(d: ImageDraw.ImageDraw, x: float, y_base: float, taille: int, texte: str) -> float:
    """Le logo du site : le nom coupé par la bande du maillot."""
    f = anton(taille)
    d.text((x, y_base), texte, font=f, fill=BLANC, anchor="ls")
    x_fin = x + f.getlength(texte) + taille * 0.18
    haut = y_base - taille * 0.86
    bas = y_base + taille * 0.08
    bande = taille * 0.42
    bord = max(2, round(taille * 0.07))
    d.rectangle([x_fin, haut, x_fin + bande, bas], fill=BLANC)
    d.rectangle([x_fin + bord, haut, x_fin + bande - bord, bas], fill=ROUGE)
    return x_fin + bande


def couper(texte: str, f: ImageFont.FreeTypeFont, largeur_max: float) -> list[str]:
    mots, lignes, ligne = texte.split(), [], ""
    for mot in mots:
        essai = f"{ligne} {mot}".strip()
        if f.getlength(essai) <= largeur_max or not ligne:
            ligne = essai
        else:
            lignes.append(ligne)
            ligne = mot
    if ligne:
        lignes.append(ligne)
    return lignes


def titre_ajuste(texte: str, largeur_max: float, hauteur_max: float):
    """Cherche la plus grande taille de titre qui tient en trois lignes."""
    for taille in range(150, 47, -4):
        f = anton(taille)
        lignes = couper(texte, f, largeur_max)
        interligne = taille * 1.08
        if len(lignes) <= 3 and len(lignes) * interligne <= hauteur_max and all(
            f.getlength(l) <= largeur_max for l in lignes
        ):
            return f, lignes, interligne
    f = anton(48)
    lignes = couper(texte, f, largeur_max)[:3]
    return f, lignes, 48 * 1.08


def fond(photo: str | None) -> Image.Image:
    img = Image.new("RGB", (LARGEUR, HAUTEUR), NUIT)
    if photo:
        chemin = RACINE / photo.lstrip("/")
        if chemin.exists():
            p = Image.open(chemin).convert("RGB")
            p = ImageOps.fit(p, (LARGEUR, HAUTEUR), Image.LANCZOS)
            voile = Image.new("RGB", (LARGEUR, HAUTEUR), NUIT)
            img = Image.blend(p, voile, 0.78)
    return img


def texte_simple(valeur) -> str:
    if valeur is None:
        return ""
    return str(valeur).strip()


def note(valeur) -> str:
    v = texte_simple(valeur)
    if re.fullmatch(r"\d+\.0", v):
        v = v[:-2]
    return v.replace(".", ",")


def image_breve(b: dict, numero: int, signature: str, nom_logo: str) -> Image.Image:
    img = fond(b.get("photo"))
    d = ImageDraw.Draw(img)

    # Manchette
    logo(d, MARGE, 92, 46, nom_logo)
    f_site = barlow(24, 600)
    site = "VUDAUTEUIL.FR"
    ecrire_espace(d, (LARGEUR - MARGE - largeur_espacee(site, f_site, 0.14), 88), site, f_site, GRIS_CLAIR, 0.14)
    d.line([MARGE, 124, LARGEUR - MARGE, 124], fill=FILET_NUIT, width=2)

    # Rubrique : pastille + compétition
    f_pastille = barlow(24, 700)
    pastille = f"BRÈVE N°{numero}"
    lp = largeur_espacee(pastille, f_pastille, 0.14)
    y_rub = 176
    d.rectangle([MARGE, y_rub - 26, MARGE + lp + 24, y_rub + 8], fill=ROUGE)
    ecrire_espace(d, (MARGE + 12, y_rub), pastille, f_pastille, BLANC, 0.14)
    rubrique = texte_simple(b.get("competition"))
    if b.get("journee"):
        rubrique += f" · {texte_simple(b.get('journee'))}"
    ecrire_espace(d, (MARGE + lp + 44, y_rub), rubrique.upper(), barlow(24, 600), GRIS_CLAIR, 0.12)

    # Titre
    haut_panneau = HAUTEUR - 176
    zone_titre = haut_panneau - 34 - (y_rub + 30)
    f_titre, lignes, interligne = titre_ajuste(
        texte_simple(b.get("title")).upper(), LARGEUR - 2 * MARGE, zone_titre
    )
    bloc = interligne * (len(lignes) - 1) + f_titre.size * 0.86
    y = y_rub + 30 + (zone_titre - bloc) / 2 + f_titre.size * 0.86
    for l in lignes:
        d.text((MARGE, y), l, font=f_titre, fill=BLANC, anchor="ls")
        y += interligne

    # Tableau d'affichage
    d.rectangle([0, haut_panneau, LARGEUR, HAUTEUR], fill=NUIT_FONCE)
    d.rectangle([0, haut_panneau, LARGEUR, haut_panneau + 6], fill=ROUGE)
    adversaire = texte_simple(b.get("adversaire")).upper()
    bp, ba = texte_simple(b.get("buts_psg")), texte_simple(b.get("buts_adversaire"))
    if b.get("domicile", True):
        gauche, droite, c1, c2 = "PSG", adversaire, bp, ba
    else:
        gauche, droite, c1, c2 = adversaire, "PSG", ba, bp

    notes = []
    if texte_simple(b.get("note_tribune")):
        notes.append(("TRIBUNE", f"{note(b.get('note_tribune'))}/10", ROUGE_VIF))
    if texte_simple(b.get("note_terrain")):
        notes.append(("TERRAIN", f"{note(b.get('note_terrain'))}/10", BLANC))
    homme = texte_simple(b.get("homme_du_soir")).upper()

    # Colonne de droite : la note du virage
    x_notes_min = LARGEUR - MARGE - 470 if (notes or homme) else LARGEUR - MARGE
    y_label = haut_panneau + 56
    y_val = haut_panneau + 118
    x = x_notes_min
    f_label, f_val = barlow(20, 600), anton(54)
    for label, val, couleur in notes:
        ecrire_espace(d, (x, y_label), label, f_label, GRIS_CLAIR, 0.14)
        d.text((x, y_val), val, font=f_val, fill=couleur, anchor="ls")
        x += max(f_val.getlength(val), largeur_espacee(label, f_label, 0.14)) + 40
    if homme:
        largeur_restante = LARGEUR - MARGE - x
        f_h = anton(40)
        if notes and f_h.getlength(homme) > largeur_restante:
            # Pas la place à côté des notes : une ligne en dessous, libellé et nom côte à côte.
            y_ligne = HAUTEUR - 22
            libelle = "L'HOMME DU SOIR"
            x_nom = ecrire_espace(d, (x_notes_min, y_ligne), libelle, f_label, GRIS_CLAIR, 0.14) + 14
            for taille_h in range(30, 15, -2):
                f_h = anton(taille_h)
                if f_h.getlength(homme) <= LARGEUR - MARGE - x_nom:
                    break
            d.text((x_nom, y_ligne), homme, font=f_h, fill=BLANC, anchor="ls")
        else:
            ecrire_espace(d, (x, y_label), "L'HOMME DU SOIR", f_label, GRIS_CLAIR, 0.14)
            for taille_h in range(40, 19, -2):
                f_h = anton(taille_h)
                if f_h.getlength(homme) <= largeur_restante:
                    break
            d.text((x, y_val), homme, font=f_h, fill=BLANC, anchor="ls")

    # Colonne de gauche : le score
    largeur_score = x_notes_min - MARGE - 48
    for taille in range(60, 27, -2):
        f_score = anton(taille)
        case = taille * 1.25
        total = f_score.getlength(gauche) + f_score.getlength(droite) + 2 * case + taille * 1.64
        if total <= largeur_score:
            break
    y_score = haut_panneau + 26 + (176 - 26) / 2 + taille * 0.36
    x = MARGE
    d.text((x, y_score), gauche, font=f_score, fill=BLANC, anchor="ls")
    x += f_score.getlength(gauche) + taille * 0.4
    for i, chiffre in enumerate((c1, c2)):
        haut_case = y_score - taille * 0.98
        d.rectangle([x, haut_case, x + case, y_score + taille * 0.16], fill=NUIT, outline=FILET_NUIT, width=2)
        d.text((x + case / 2, y_score), chiffre, font=f_score, fill=JAUNE, anchor="ms")
        x += case
        if i == 0:
            y_tiret = y_score - taille * 0.42
            d.rectangle([x + taille * 0.22, y_tiret - taille * 0.04, x + taille * 0.62, y_tiret + taille * 0.04], fill=GRIS_CLAIR)
            x += taille * 0.84
    x += taille * 0.4
    d.text((x, y_score), droite, font=f_score, fill=BLANC, anchor="ls")

    if notes or homme:
        d.line([x_notes_min - 32, haut_panneau + 30, x_notes_min - 32, HAUTEUR - 26], fill=FILET_NUIT, width=2)
    return img


def image_generale(nom_logo: str, slogan: str) -> Image.Image:
    img = Image.new("RGB", (LARGEUR, HAUTEUR), NUIT)
    d = ImageDraw.Draw(img)
    taille = 150
    f = anton(taille)
    largeur_logo = f.getlength(nom_logo) + taille * (0.18 + 0.42)
    x = (LARGEUR - largeur_logo) / 2
    logo(d, x, 330, taille, nom_logo)

    f_slogan = barlow(34, 700)
    s = slogan.upper()
    ecrire_espace(d, ((LARGEUR - largeur_espacee(s, f_slogan, 0.18)) / 2, 410), s, f_slogan, ROUGE_VIF, 0.18)
    f_phrase = newsreader_italique(34)
    phrase = "Les matchs du PSG racontés depuis le Virage Auteuil."
    d.text((LARGEUR / 2, 470), phrase, font=f_phrase, fill=TEXTE_NUIT, anchor="ms")

    # Le liseré du pied de page : rouge et blanc
    d.rectangle([0, HAUTEUR - 34, LARGEUR, HAUTEUR], fill=ROUGE)
    d.rectangle([0, HAUTEUR - 34, LARGEUR, HAUTEUR - 28], fill=BLANC)
    f_site = barlow(22, 600)
    site = "VUDAUTEUIL.FR"
    ecrire_espace(d, ((LARGEUR - largeur_espacee(site, f_site, 0.16)) / 2, 560), site, f_site, GRIS_CLAIR, 0.16)
    return img


def lire_breve(chemin: Path):
    texte = chemin.read_text(encoding="utf-8")
    m = re.match(r"^---\s*\n(.*?)\n---\s*(\n|$)", texte, re.S)
    if not m:
        return None, texte
    return yaml.safe_load(m.group(1)) or {}, texte


def date_breve(chemin: Path, donnees: dict) -> dt.date:
    v = donnees.get("date")
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if v:
        try:
            return dt.date.fromisoformat(str(v)[:10])
        except ValueError:
            pass
    return dt.date.fromisoformat(chemin.name[:10])


def injecter(chemin: Path, texte: str, valeur: dict) -> None:
    ligne = "image: " + json.dumps(valeur, ensure_ascii=False)
    nouveau = re.sub(r"^---\s*\n", "---\n" + ligne + "\n", texte, count=1)
    chemin.write_text(nouveau, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--injecter", action="store_true", help="déclare chaque image dans sa brève")
    parser.add_argument("--generale", action="store_true", help="refait aussi l'image générale")
    args = parser.parse_args()

    reglages = yaml.safe_load(REGLAGES.read_text(encoding="utf-8")) or {}
    nom_logo = " ".join(
        p for p in (texte_simple(reglages.get("logo_debut")), texte_simple(reglages.get("logo_fin"))) if p
    ) or "VU D'AUTEUIL"
    signature = texte_simple(reglages.get("signature"))
    SORTIE.mkdir(parents=True, exist_ok=True)

    if args.generale:
        image_generale(nom_logo, texte_simple(reglages.get("slogan")) or "Brèves de tribune").save(
            SORTIE / "vu-dauteuil.png", optimize=True
        )
        print("Image générale : assets/partage/vu-dauteuil.png")

    # Mêmes règles que Jekyll : pas les brouillons, pas les dates à venir.
    aujourdhui = dt.datetime.now(dt.timezone(dt.timedelta(hours=1))).date()
    breves = []
    for chemin in sorted(BREVES.glob("*.md")):
        donnees, texte = lire_breve(chemin)
        if donnees is None or donnees.get("published") is False:
            continue
        jour = date_breve(chemin, donnees)
        if jour > aujourdhui:
            continue
        breves.append((jour, chemin.name, chemin, donnees, texte))
    breves.sort(key=lambda b: (b[0], b[1]))

    for numero, (jour, _, chemin, donnees, texte) in enumerate(breves, start=1):
        nom = chemin.stem + ".png"
        image_breve(donnees, numero, signature, nom_logo).save(SORTIE / nom, optimize=True)
        print(f"Brève n°{numero} : assets/partage/{nom}")
        if args.injecter and "image" not in donnees:
            bp, ba = texte_simple(donnees.get("buts_psg")), texte_simple(donnees.get("buts_adversaire"))
            adv = texte_simple(donnees.get("adversaire"))
            score = f"PSG {bp}-{ba} {adv}" if donnees.get("domicile", True) else f"{adv} {ba}-{bp} PSG"
            alt = f"Brève n°{numero} de Vu d'Auteuil, « {texte_simple(donnees.get('title'))} » : {score}"
            if texte_simple(donnees.get("note_tribune")):
                alt += f", note de la tribune {note(donnees.get('note_tribune'))}/10"
            injecter(
                chemin,
                texte,
                {"path": f"/assets/partage/{nom}", "width": LARGEUR, "height": HAUTEUR, "alt": alt},
            )
    return 0


if __name__ == "__main__":
    sys.exit(main())
