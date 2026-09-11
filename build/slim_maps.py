#!/usr/bin/env python3
"""
Etape 2bis : allege data/maps.json sans nouvelle requete reseau.

Les rues residentielles representent l'essentiel du poids alors qu'elles ne
servent qu'a donner de la texture. On supprime les troncons trop courts pour
etre lisibles a l'echelle d'affichage, et on resimplifie le reste.

Usage : python3 build/slim_maps.py
"""
import json, math, os, re

PATH = "data/maps.json"
# par couche : longueur minimale d'un troncon (m), tolerance de simplification (m)
RULES = {"minor": (70, 9), "ped": (45, 7), "mid": (0, 5), "major": (0, 4),
         "rail": (60, 10), "park": (0, 9), "waterpoly": (0, 9), "waterline": (0, 7)}
TOKEN = re.compile(r"([MlLz])\s*(-?\d+)?\s*(-?\d+)?")


def parse(path):
    """Decoupe une chaine SVG en une liste de sous-chemins (points, ferme)."""
    subs, pts, closed, x, y = [], [], False, 0, 0
    for cmd, a, b in TOKEN.findall(path):
        if cmd == "M":
            if pts:
                subs.append((pts, closed))
            x, y, pts, closed = int(a), int(b), [], False
            pts.append((x, y))
        elif cmd in "lL":
            if cmd == "l":
                x, y = x + int(a), y + int(b)
            else:
                x, y = int(a), int(b)
            pts.append((x, y))
        elif cmd == "z":
            closed = True
    if pts:
        subs.append((pts, closed))
    return subs


def length(pts):
    return sum(math.dist(pts[i - 1], pts[i]) for i in range(1, len(pts)))


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


def emit(points, closed):
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
    if closed:
        out.append("z")
    return "".join(out)


def main():
    maps = json.load(open(PATH, encoding="utf-8"))
    before = os.path.getsize(PATH)
    for city, layers in maps.items():
        for name, path in list(layers.items()):
            min_len, tol = RULES.get(name, (0, 6))
            kept = []
            for points, closed in parse(path):
                if not closed and min_len and length(points) < min_len:
                    continue
                pts = simplify(points, tol)
                if len(pts) >= 2:
                    kept.append(emit(pts, closed))
            layers[name] = "".join(kept)
        total = sum(len(v) for v in layers.values()) // 1024
        print(f"  {city:10} -> {total} Ko")
    json.dump(maps, open(PATH, "w", encoding="utf-8"))
    after = os.path.getsize(PATH)
    print(f"\n{PATH} : {before // 1024} Ko -> {after // 1024} Ko "
          f"({100 - after * 100 // before} % de moins)")


if __name__ == "__main__":
    main()
