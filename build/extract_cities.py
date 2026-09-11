#!/usr/bin/env python3
"""
Etape 1 : Base Nationale des Lieux de Stationnement -> data/cities.json

Telecharge le jeu de donnees national publie par transport.data.gouv.fr,
en extrait les villes retenues, verifie la coherence des grilles tarifaires
et projette les coordonnees en metres autour du centre de chaque ville.

Aucune valeur n'est completee ni estimee : un champ absent de la source
reste absent du fichier de sortie.

Usage : python3 build/extract_cities.py
"""
import csv, io, json, math, os, time, urllib.request

BNLS_URL = ("https://static.data.gouv.fr/resources/base-nationale-des-lieux-de-stationnement/"
            "20240109-111856/base-nationale-des-lieux-de-stationnement-outil-de-consolidation-bnls-v2.csv")
CSV_PATH = "data/bnls-v2.csv"
OUT_PATH = "data/cities.json"

# Villes retenues : couverture tarifaire suffisante dans la base.
# L'ordre est celui du selecteur de ville dans l'app, de la plus petite a la plus grande.
CITIES = [
    ("73065", "Chambéry"),
    ("86194", "Poitiers"),
    ("87085", "Limoges"),
    ("57463", "Metz"),
    ("38185", "Grenoble"),
    ("67482", "Strasbourg"),
    ("44109", "Nantes"),
]
DURATIONS = ["1h", "2h", "3h", "4h", "24h"]


def download_source():
    if os.path.exists(CSV_PATH):
        print(f"source deja presente : {CSV_PATH}")
        return
    os.makedirs("data", exist_ok=True)
    print("telechargement de la base nationale...")
    urllib.request.urlretrieve(BNLS_URL, CSV_PATH)
    print(f"  -> {CSV_PATH} ({os.path.getsize(CSV_PATH)} octets)")


def cell(row, key):
    """Valeur nettoyee, ou chaine vide si la source ne renseigne rien."""
    v = (row.get(key) or "").strip()
    return "" if v in ("NA", "null", "None", "nan") else v


def as_float(row, key):
    v = cell(row, key).replace(",", ".")
    try:
        return float(v)
    except ValueError:
        return None


def as_int(row, key):
    v = as_float(row, key)
    return None if v is None else int(round(v))


def inconsistent_durations(tariffs):
    """Durees dont le tarif est inferieur a celui de la duree precedente.

    C'est une anomalie de la base source. On la signale, on ne la corrige pas.
    """
    known = [(d, tariffs[d]) for d in DURATIONS if tariffs[d] is not None]
    return [known[i][0] for i in range(1, len(known))
            if known[i][1] < known[i - 1][1] - 1e-9]


def geometric_median(points, max_iter=200):
    """Point qui minimise la somme des distances : robuste aux parkings isoles.

    Sert de point de depart par defaut, bien plus proche du centre-ville
    que le centroide administratif de la commune.
    """
    x = sum(p[0] for p in points) / len(points)
    y = sum(p[1] for p in points) / len(points)
    for _ in range(max_iter):
        nx = ny = weight = 0.0
        for px, py in points:
            d = max(math.hypot(px - x, py - y), 1e-6)
            nx += px / d
            ny += py / d
            weight += 1 / d
        nx, ny = nx / weight, ny / weight
        if math.hypot(nx - x, ny - y) < 0.5:
            return [round(nx), round(ny)]
        x, y = nx, ny
    return [round(x), round(y)]


def population(insee):
    try:
        url = f"https://geo.api.gouv.fr/communes/{insee}?fields=population"
        with urllib.request.urlopen(url, timeout=12) as r:
            return json.load(r).get("population")
    except Exception:
        return None


def main():
    download_source()
    with open(CSV_PATH, encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter=";"))
    print(f"{len(rows)} parkings dans la base nationale")

    out = {}
    for insee, ville in CITIES:
        raw = [r for r in rows if cell(r, "insee") == insee]
        parkings = []
        for r in raw:
            lat, lon = as_float(r, "Ylat"), as_float(r, "Xlong")
            if lat is None or lon is None:
                continue
            is_free = cell(r, "gratuit") == "1"
            tariffs = {d: (0.0 if is_free else as_float(r, "tarif_" + d)) for d in DURATIONS}
            height = as_int(r, "hauteur_max")  # centimetres dans la source
            parkings.append({
                "id": cell(r, "id") or f"{insee}-{len(parkings)}",
                "nom": cell(r, "nom") or "Parking",
                "adr": cell(r, "adresse"),
                "url": cell(r, "url"),
                "lat": lat, "lon": lon,
                "free": is_free,
                # tarifs en centimes d'euro, None si la source ne renseigne pas
                "tar": {d: (None if tariffs[d] is None else round(tariffs[d] * 100))
                        for d in DURATIONS},
                "bad": inconsistent_durations(tariffs),
                "places": as_int(r, "nb_places"),
                "pmr": as_int(r, "nb_pmr"),
                "ev": as_int(r, "nb_voitures_electriques"),
                "velo": as_int(r, "nb_velo"),
                "moto": as_int(r, "nb_2_rm"),
                "pr": as_int(r, "nb_pr"),
                "haut": (height / 100 if height and 100 < height < 400 else None),
                "ouvrage": cell(r, "type_ouvrage"),
                "usagers": cell(r, "type_usagers"),
                "abo_r": as_float(r, "abo_resident"),
                "abo_n": as_float(r, "abo_non_resident"),
                "info": cell(r, "info"),
            })
        if not parkings:
            print(f"  {ville}: aucun parking geolocalise, ville ignoree")
            continue

        # projection locale en metres, origine au centre du nuage de parkings
        lat0 = (min(p["lat"] for p in parkings) + max(p["lat"] for p in parkings)) / 2
        lon0 = (min(p["lon"] for p in parkings) + max(p["lon"] for p in parkings)) / 2
        metres_per_deg_lon = 111320 * math.cos(math.radians(lat0))
        for p in parkings:
            p["x"] = round((p["lon"] - lon0) * metres_per_deg_lon)
            p["y"] = round((p["lat"] - lat0) * -110574)
            p["ll"] = [round(p["lat"], 6), round(p["lon"], 6)]  # conserve pour les liens GPS
            del p["lat"], p["lon"]

        start = geometric_median([(p["x"], p["y"]) for p in parkings])
        spread = sorted(math.hypot(p["x"] - start[0], p["y"] - start[1]) for p in parkings)
        nth = spread[min(8, len(spread)) - 1]

        covered = {d: sum(1 for p in parkings if p["tar"][d] is not None) for d in DURATIONS}
        flagged = sum(1 for p in parkings if p["bad"])
        print(f"  {ville:12} {len(parkings):>3} parkings | tarifs " +
              " ".join(f"{d}:{covered[d]}" for d in DURATIONS) +
              (f" | {flagged} grille(s) incoherente(s)" if flagged else ""))

        out[insee] = {
            "insee": insee,
            "ville": ville,
            "pop": population(insee),
            "lat0": round(lat0, 6), "lon0": round(lon0, 6),
            "start": start,
            "view": max(1300, round(nth * 2.6)),  # largeur de vue par defaut, en metres
            "parkings": parkings,
        }
        time.sleep(0.4)

    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    total = sum(len(c["parkings"]) for c in out.values())
    print(f"\n{OUT_PATH} : {len(out)} villes, {total} parkings, "
          f"{os.path.getsize(OUT_PATH) // 1024} Ko")


if __name__ == "__main__":
    main()
