#!/usr/bin/env python3
"""
Etape 3 : src/app.template.html + data/*.json -> index.html et dist/artifact.html

Produit deux sorties a partir du meme gabarit :

  index.html         document HTML complet, autonome, pour Vercel / GitHub Pages
  dist/artifact.html fragment sans <head>, pour publication en Artifact claude.ai
                     (l'hote y ajoute lui-meme doctype, charset et reset)

La page embarque toutes ses donnees : le CSP des artefacts publies interdit
d'appeler une API ou de charger un fichier externe a l'execution.

Usage : python3 build/assemble.py
"""
import json, os

TEMPLATE = "src/app.template.html"
STANDALONE = "index.html"
FRAGMENT = "dist/artifact.html"

HEAD = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Comparateur de parkings sur sept villes francaises. Tarifs issus de la Base Nationale des Lieux de Stationnement.">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  html{color-scheme:light dark}
  body{margin:0}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
"""
TAIL = "\n</body>\n</html>\n"


def main():
    template = open(TEMPLATE, encoding="utf-8").read()
    maps = open("data/maps.json", encoding="utf-8").read()
    cities = open("data/cities.json", encoding="utf-8").read()

    for marker in ("__MAPS__", "__CITIES__"):
        if marker not in template:
            raise SystemExit(f"marqueur {marker} absent de {TEMPLATE}")

    body = template.replace("__MAPS__", maps).replace("__CITIES__", cities)

    # Le gabarit commence par <title> puis les <link> de polices : ils doivent
    # rester dans le <head> du document autonome.
    split_at = body.index("<style>")
    head_part, body_part = body[:split_at], body[split_at:]
    end_style = body_part.index("</style>") + len("</style>")
    head_part += body_part[:end_style]
    body_part = body_part[end_style:]

    os.makedirs("dist", exist_ok=True)
    open(STANDALONE, "w", encoding="utf-8").write(
        HEAD + head_part + "\n</head>\n<body>" + body_part + TAIL)
    open(FRAGMENT, "w", encoding="utf-8").write(body)

    data = json.loads(cities)
    parkings = sum(len(c["parkings"]) for c in data.values())
    places = sum(p["places"] or 0 for c in data.values() for p in c["parkings"])
    print(f"{STANDALONE:22} {os.path.getsize(STANDALONE) / 1024 / 1024:.2f} Mo  (autonome)")
    print(f"{FRAGMENT:22} {os.path.getsize(FRAGMENT) / 1024 / 1024:.2f} Mo  (artifact)")
    print(f"  {len(data)} villes, {parkings} parkings, {places} places")


if __name__ == "__main__":
    main()
