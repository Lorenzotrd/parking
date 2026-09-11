#!/usr/bin/env python3
"""
Etape 2 : OpenStreetMap -> data/maps.json

Interroge Overpass pour chaque ville, puis reduit les rues, l'eau, les parcs
et les voies ferrees a des chemins SVG simplifies, exprimes dans la meme
projection metrique que data/cities.json.

Usage : python3 build/build_maps.py
"""
import json, math, os, time, urllib.parse, urllib.request

CITIES_PATH = "data/cities.json"
OUT_PATH = "data/maps.json"
ENDPOINTS = ["https://overpass-api.de/api/interpreter",
             "https://overpass.kumi.systems/api/interpreter"]
MARGIN_DEG = 0.012

QUERY = """[out:json][timeout:180];
(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|pedestrian|living_street|motorway_link|trunk_link|primary_link|secondary_link)$"](%s);
 way["natural"="water"](%s);
 way["waterway"~"^(canal|river)$"](%s);
 way["leisure"~"^(park|garden)$"](%s);
 way["railway"="rail"]["service"!~"."](%s);
 rel["natural"="water"](%s););
out geom;"""

LAYER_OF_HIGHWAY = {
    "motorway": "major", "trunk": "major", "primary": "major",
    "motorway_link": "major", "trunk_link": "major", "primary_link": "major",
    "secondary": "mid", "tertiary": "mid", "secondary_link": "mid",
    "pedestrian": "ped",
}


def simplify(points, tolerance):
    """Douglas-Peucker iteratif : garde la forme, jette les points inutiles."""
    if len(points) < 3:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = points[a]
        bx, by = points[b]
        dx, dy = bx - ax, by - ay
        length_sq = dx * dx + dy * dy
        worst, worst_i = 0.0, a
        for i in range(a + 1, b):
            px, py = points[i]
            if length_sq == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))
                d = math.hypot(px - (ax + t * dx), py - (ay + t * dy))
            if d > worst:
                worst, worst_i = d, i
        if worst > tolerance:
            keep.add(worst_i)
            stack.append((a, worst_i))
            stack.append((worst_i, b))
    return [points[i] for i in sorted(keep)]


def to_path(points, close=False):
    """Chemin SVG en deplacements relatifs entiers : bien plus compact."""
    points = [(round(x), round(y)) for x, y in points]
    out, px, py = [], None, None
    for i, (x, y) in enumerate(points):
        if i == 0:
            out.append(f"M{x} {y}")
        else:
            dx, dy = x - px, y - py
            if dx == 0 and dy == 0:
                continue
            out.append(f"l{dx} {dy}")
        px, py = x, y
    if close:
        out.append("z")
    return "".join(out)


def fetch(bbox):
    query = QUERY % ((bbox,) * 6)
    for attempt in range(5):
        endpoint = ENDPOINTS[attempt % len(ENDPOINTS)]
        try:
            req = urllib.request.Request(
                endpoint,
                data=urllib.parse.urlencode({"data": query}).encode(),
                headers={"User-Agent": "parking-compare/1.0"})
            with urllib.request.urlopen(req, timeout=280) as r:
                return json.load(r)
        except Exception as exc:
            print(f"    tentative {attempt + 1} echouee : {str(exc)[:70]}", flush=True)
            time.sleep(15)
    return None


def main():
    cities = json.load(open(CITIES_PATH, encoding="utf-8"))
    done = json.load(open(OUT_PATH, encoding="utf-8")) if os.path.exists(OUT_PATH) else {}

    for insee, city in cities.items():
        if insee in done:
            print(f"{city['ville']:12} deja genere, ignore")
            continue
        lat0, lon0 = city["lat0"], city["lon0"]
        metres_per_deg_lon = 111320 * math.cos(math.radians(lat0))
        # bbox reconstruite depuis les parkings projetes
        xs = [p["x"] for p in city["parkings"]]
        ys = [p["y"] for p in city["parkings"]]
        south = lat0 - max(ys) / 110574 - MARGIN_DEG
        north = lat0 - min(ys) / 110574 + MARGIN_DEG
        west = lon0 + min(xs) / metres_per_deg_lon - MARGIN_DEG * 1.4
        east = lon0 + max(xs) / metres_per_deg_lon + MARGIN_DEG * 1.4
        bbox = f"{south:.5f},{west:.5f},{north:.5f},{east:.5f}"

        print(f"{city['ville']:12} requete Overpass...", flush=True)
        data = fetch(bbox)
        if not data:
            print(f"{city['ville']:12} ECHEC, ville sautee", flush=True)
            continue

        span_km = (north - south) * 111
        tolerance = max(1.6, span_km / 2.6)  # plus la ville est grande, plus on simplifie
        layers = {k: [] for k in
                  ["major", "mid", "minor", "ped", "waterpoly", "waterline", "park", "rail"]}

        for element in data["elements"]:
            tags = element.get("tags", {})
            if element.get("geometry"):
                geometries = [element["geometry"]]
            else:
                geometries = [m["geometry"] for m in element.get("members", [])
                              if m.get("role") == "outer" and m.get("geometry")]
            for geometry in geometries:
                pts = [((p["lon"] - lon0) * metres_per_deg_lon, (p["lat"] - lat0) * -110574)
                       for p in geometry]
                if len(pts) < 2:
                    continue
                closed = pts[0] == pts[-1]
                if tags.get("highway"):
                    key = LAYER_OF_HIGHWAY.get(tags["highway"], "minor")
                    layers[key].append(to_path(simplify(pts, tolerance)))
                elif tags.get("natural") == "water":
                    layers["waterpoly"].append(to_path(simplify(pts, tolerance * 1.3), closed))
                elif tags.get("waterway"):
                    layers["waterline"].append(to_path(simplify(pts, tolerance)))
                elif tags.get("leisure") and closed:
                    layers["park"].append(to_path(simplify(pts, tolerance * 1.3), True))
                elif tags.get("railway"):
                    layers["rail"].append(to_path(simplify(pts, tolerance * 1.4)))

        done[insee] = {k: "".join(v) for k, v in layers.items() if v}
        size_kb = sum(len(v) for v in done[insee].values()) // 1024
        print(f"{city['ville']:12} tolerance {tolerance:.1f} m, {size_kb} Ko", flush=True)
        json.dump(done, open(OUT_PATH, "w", encoding="utf-8"))
        time.sleep(5)

    total_kb = os.path.getsize(OUT_PATH) // 1024
    print(f"\n{OUT_PATH} : {len(done)} villes, {total_kb} Ko")


if __name__ == "__main__":
    main()
