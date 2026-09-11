#!/usr/bin/env python3
"""
Etape 4 : data/cities.json -> mobile/assets/cities.json

Exporte pour l'application mobile un jeu reduit a ce qu'un conducteur regarde
vraiment : le prix pour la duree choisie, la distance, les places libres et de
quoi lancer l'itineraire. Tout le reste, abonnements mensuels, places velo,
nombre de niveaux, grilles detaillees, reste dans le jeu web.

Usage : python3 build/export_mobile.py
"""
import json, os

SRC = "data/cities.json"
OUT = "mobile/assets/cities.json"
DURATIONS = ["30min", "1h", "2h", "3h", "4h", "24h"]

# Champs volontairement ecartes : grid, abo_r, abo_n, moto, velo, covoit, niv,
# info, usagers, pmr, ev, x, y. L'application ne les affiche pas, ils n'ont donc
# rien a faire dans le fichier embarque.
KEEP = ("id", "nom", "adr", "ll", "tar", "bad", "free", "places",
        "haut", "ouvrage", "street1h", "live")

LABEL = {"ouvrage": "Ouvrage", "enclos_en_surface": "Enclos", "surface": "Surface",
         "parking_relais": "Parking relais", "mixte": "Mixte", "silo": "Silo",
         "enterre": "Souterrain"}


def main():
    cities = json.load(open(SRC, encoding="utf-8"))
    out = {}
    for key, city in cities.items():
        parkings = []
        for p in city["parkings"]:
            q = {k: p[k] for k in KEEP if k in p}
            t = (q.get("ouvrage") or "").lower()
            q["ouvrage"] = LABEL.get(t, q.get("ouvrage") or None)
            # une valeur nulle n'a pas besoin d'occuper de place dans le fichier,
            # sauf l'identifiant et le nom, dont l'application a toujours besoin
            slim = {k: v for k, v in q.items() if v not in (None, "", [])}
            slim["id"] = q["id"]
            slim["nom"] = q.get("nom") or "Parking"
            parkings.append(slim)
        src = city["source"]
        out[key] = {
            "ville": city["ville"],
            "source": {"court": src.get("court", src["nom"]), "nom": src["nom"],
                       "maj": src.get("maj"), "url": src.get("url"),
                       "live_api": src.get("live_api"), "live_key": src.get("live_key")},
            "center": [city["lat0"], city["lon0"]],
            "parkings": parkings,
        }
        live = sum(1 for p in parkings if p.get("live"))
        print(f"  {city['ville']:10} {len(parkings):>3} parkings" +
              (f", {live} en direct" if live else ""))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    print(f"\n{OUT} : {os.path.getsize(OUT) // 1024} Ko "
          f"(le jeu web en fait {os.path.getsize(SRC) // 1024})")


if __name__ == "__main__":
    main()
