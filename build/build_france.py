#!/usr/bin/env python3
"""
Etape 0 : contours de la France -> data/france.json

Produit un fond de carte national schematique : la silhouette du pays et le
trace des departements, simplifies pour peser quelques dizaines de kilo-octets,
plus la position des villes couvertes et de celles verifiees sans tarif publie.

Usage : python3 build/build_france.py
"""
import json, math, os, time, urllib.request

GEOJSON_URL = "https://france-geojson.gregoiredavid.fr/repo/departements.geojson"
CACHE = "/tmp/departements.geojson"
OUT = "data/france.json"
UA = {"User-Agent": "parking-compare/2.0"}

# Centre de la projection : milieu de la France metropolitaine.
LAT0, LON0 = 46.6, 2.5
SCALE = 900  # pixels pour 10 degres de latitude

# Villes couvertes par l'application, dans l'ordre du selecteur.
COVERED = [("bordeaux", "Bordeaux"), ("nantes", "Nantes"),
           ("rouen", "Rouen"), ("paris", "Paris")]

# Villes verifiees dont le portail ne publie aucune grille tarifaire utilisable.
# Les afficher est une information en soi : la donnee ouverte est tres inegale.
CHECKED = [
    ("Strasbourg", 48.5734, 7.7521, "parkings publiés sans tarif"),
    ("Angers", 47.4784, -0.5632, "parkings publiés sans tarif"),
    ("Saint-Étienne", 45.4397, 4.3872, "parkings publiés sans tarif"),
    ("Toulouse", 43.6045, 1.4442, "aucun jeu de parkings tarifé"),
    ("Lyon", 45.7640, 4.8357, "tarifs partiels et anciens"),
    ("Rennes", 48.1173, -1.6778, "jeu de parkings de 2023"),
    ("Montpellier", 43.6108, 3.8767, "parkings publiés sans tarif"),
    ("Grenoble", 45.1885, 5.7245, "seulement via la base nationale"),
    ("Metz", 49.1193, 6.1757, "seulement via la base nationale"),
    ("Chambéry", 45.5646, 5.9178, "seulement via la base nationale"),
    ("Limoges", 45.8336, 1.2611, "seulement via la base nationale"),
    ("Poitiers", 46.5802, 0.3404, "seulement via la base nationale"),
    ("Lille", 50.6292, 3.0573, "tarifs partiels"),
    ("Nice", 43.7102, 7.2620, "tarifs partiels"),
    ("Marseille", 43.2965, 5.3698, "aucun jeu de parkings tarifé"),
]


def project(lon, lat):
    """Equirectangulaire centree sur la France : suffisant a cette echelle."""
    x = (lon - LON0) * math.cos(math.radians(LAT0)) * SCALE / 10
    y = -(lat - LAT0) * SCALE / 10
    return x, y


def simplify(points, tol):
    if len(points) < 3:
        return points
    keep, stack = {0, len(points) - 1}, [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        worst, wi = 0.0, a
        for i in range(a + 1, b):
            px, py = points[i]
            if L == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L))
                d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
            if d > worst:
                worst, wi = d, i
        if worst > tol:
            keep.add(wi)
            stack += [(a, wi), (wi, b)]
    return [points[i] for i in sorted(keep)]


def to_path(points):
    points = [(round(x, 1), round(y, 1)) for x, y in points]
    out, px, py = [], None, None
    for i, (x, y) in enumerate(points):
        if i == 0:
            out.append(f"M{x} {y}")
        else:
            dx, dy = round(x - px, 1), round(y - py, 1)
            if dx == 0 and dy == 0:
                continue
            out.append(f"l{dx} {dy}")
        px, py = x, y
    out.append("z")
    return "".join(out)


def rings(geometry):
    if geometry["type"] == "Polygon":
        return [geometry["coordinates"][0]]
    return [poly[0] for poly in geometry["coordinates"]]


def city_point(key_or_lat, lat=None, lon=None):
    return None


def main():
    if os.path.exists(CACHE):
        data = json.load(open(CACHE, encoding="utf-8"))
    else:
        with urllib.request.urlopen(urllib.request.Request(GEOJSON_URL, headers=UA),
                                    timeout=120) as r:
            data = json.load(r)
        json.dump(data, open(CACHE, "w", encoding="utf-8"))
    print(f"{len(data['features'])} départements")

    paths = []
    for feature in data["features"]:
        code = feature["properties"]["code"]
        if not code[0].isdigit() or code.startswith("97"):  # outre-mer
            continue
        for ring in rings(feature["geometry"]):
            pts = [project(lon, lat) for lon, lat in ring]
            # on jette les ilots trop petits pour etre lisibles
            span = max(max(p[0] for p in pts) - min(p[0] for p in pts),
                       max(p[1] for p in pts) - min(p[1] for p in pts))
            if span < 4:
                continue
            pts = simplify(pts, 1.1)
            if len(pts) >= 4:
                paths.append(to_path(pts))

    cities = json.load(open("data/cities.json", encoding="utf-8"))
    covered = []
    for key, label in COVERED:
        c = cities.get(key)
        if not c:
            continue
        x, y = project(c["lon0"], c["lat0"])
        covered.append({"key": key, "nom": label,
                        "x": round(x, 1), "y": round(y, 1),
                        "n": len(c["parkings"]),
                        "maj": c["source"]["maj"]})
    checked = []
    for nom, lat, lon, why in CHECKED:
        x, y = project(lon, lat)
        checked.append({"nom": nom, "x": round(x, 1), "y": round(y, 1), "why": why})

    # cadre calcule sur la silhouette du pays, avec de la marge en haut pour
    # que l'etiquette d'une ville du nord ne soit pas rognee
    xs, ys = [], []
    for feature in data["features"]:
        code = feature["properties"]["code"]
        if not code[0].isdigit() or code.startswith("97"):
            continue
        for ring in rings(feature["geometry"]):
            for lon, lat in ring:
                x, y = project(lon, lat)
                xs.append(x)
                ys.append(y)
    out = {"paths": "".join(paths), "covered": covered, "checked": checked,
           "bbox": [round(min(xs) - 14), round(min(ys) - 40),
                    round(max(xs) + 14), round(max(ys) + 16)]}
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"))
    print(f"{OUT} : {os.path.getsize(OUT) // 1024} Ko, "
          f"{len(covered)} villes couvertes, {len(checked)} villes vérifiées sans tarif")


if __name__ == "__main__":
    main()
