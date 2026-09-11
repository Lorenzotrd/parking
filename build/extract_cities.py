#!/usr/bin/env python3
"""
Etape 1 : portails officiels des metropoles -> data/cities.json

Chaque ville est lue a sa propre source, celle de l'autorite qui fixe les prix,
et non a la consolidation nationale qui accuse un an de retard. Chaque ville
porte donc son jeu de donnees, sa licence et sa date de mise a jour, affiches
dans l'application.

Aucune valeur n'est completee, arrondie ni estimee : un champ absent de la
source reste absent du fichier de sortie.

Usage : python3 build/extract_cities.py
"""
import csv, io, json, math, re, time, unicodedata, urllib.parse, urllib.request

OUT_PATH = "data/cities.json"
UA = {"User-Agent": "parking-compare/2.0 (+https://github.com/Lorenzotrd/parking)"}

# Echelle de durees commune au classement. Une ville qui ne publie pas une duree
# la laisse vide : l'application desactive alors le bouton correspondant.
DURATIONS = ["30min", "1h", "2h", "3h", "4h", "24h"]


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def fnum(v):
    if v in (None, "", "NA", "null"):
        return None
    try:
        return float(str(v).replace(",", "."))
    except ValueError:
        return None


def inum(v):
    f = fnum(v)
    return None if f is None else int(round(f))


def ods_all(host, dataset, page=100):
    """Pagine un jeu Opendatasoft en entier."""
    out, offset = [], 0
    while True:
        url = (f"https://{host}/api/explore/v2.1/catalog/datasets/{dataset}"
               f"/records?limit={page}&offset={offset}")
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
            d = json.load(r)
        out += d["results"]
        if len(out) >= d["total_count"] or not d["results"]:
            return out
        offset += page


def ods_modified(host, dataset):
    url = f"https://{host}/api/explore/v2.1/catalog/datasets/{dataset}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            return (json.load(r).get("metas", {}).get("default", {}).get("modified") or "")[:10]
    except Exception:
        return None


def blank():
    return {d: None for d in DURATIONS}


def check(tariffs):
    """Durees dont le tarif est inferieur a celui de la duree precedente.

    Anomalie de la source. On la signale, on ne la corrige pas.
    """
    known = [(d, tariffs[d]) for d in DURATIONS if tariffs[d] is not None]
    return [known[i][0] for i in range(1, len(known))
            if known[i][1] < known[i - 1][1] - 1e-9]


# --------------------------------------------------------------------------
# Bordeaux : un seul jeu porte tout, y compris le tarif de la voirie voisine
# et le nombre de places libres en direct.
# --------------------------------------------------------------------------
def bordeaux():
    host, ds = "opendata.bordeaux-metropole.fr", "st_park_p"
    rows = ods_all(host, ds)
    parkings = []
    for r in rows:
        pt = r.get("geo_point_2d") or {}
        if not pt.get("lat"):
            continue
        tar = blank()
        for key, dur in [("th_demi", "30min"), ("th_heur", "1h"), ("th_2", "2h"),
                         ("th_3", "3h"), ("th_4", "4h"), ("th_24", "24h")]:
            tar[dur] = fnum(r.get(key))
        native = [(lbl, fnum(r.get(k))) for k, lbl in
                  [("th_quar", "15 min"), ("th_demi", "30 min"), ("th_heur", "1 h"),
                   ("th_2", "2 h"), ("th_3", "3 h"), ("th_4", "4 h"),
                   ("th_10", "10 h"), ("th_24", "24 h"), ("th_nuit", "nuit")]]
        parkings.append({
            "id": r.get("ident") or r.get("gid"),
            "nom": r.get("nom"), "adr": r.get("adresse"), "url": r.get("url"),
            "lat": pt["lat"], "lon": pt["lon"],
            "tar": tar, "grid": [(l, v) for l, v in native if v is not None],
            "street1h": fnum(r.get("tv_1h")),
            "places": inum(r.get("np_total")), "pmr": inum(r.get("np_pmr")),
            "ev": inum(r.get("np_vle")), "velo": inum(r.get("np_veltot")),
            "moto": inum(r.get("np_2rmot")), "covoit": inum(r.get("np_covoit")),
            "haut": fnum(r.get("gabari_std")),
            "ouvrage": (r.get("type") or "").capitalize(),
            "ex": r.get("exploit"), "niv": inum(r.get("nb_niv")),
            "abo_r": fnum(r.get("ta_resmoi")), "abo_n": fnum(r.get("ta_nres7j")),
            "info": r.get("infor"),
            # releve de disponibilite : seulement si le parking est reellement connecte
            "live": ({"libres": inum(r.get("libres")), "total": inum(r.get("total")),
                      "at": r.get("mdate")} if r.get("connecte") == 1 else None),
        })
    return parkings, {
        "nom": "Bordeaux Métropole", "court": "Bordeaux", "jeu": ds, "host": host,
        "url": f"https://{host}/explore/dataset/{ds}/",
        "maj": ods_modified(host, ds), "licence": "Licence Ouverte",
        "live_api": f"https://{host}/api/explore/v2.1/catalog/datasets/{ds}"
                    f"/records?limit=100&select=ident,libres,total,connecte,mdate",
        "live_key": "ident",
    }


# --------------------------------------------------------------------------
# Nantes : structure et capacites dans le jeu metropolitain, grille tarifaire
# fine dans le jeu dedie, disponibilites dans un troisieme.
# --------------------------------------------------------------------------
def nantes():
    host = "data.nantesmetropole.fr"
    ds_base = "244400404_lieux-stationnement-nantes-metropole"
    ds_grid = "244400404_parkings-publics-parcs-relais-nantes-metropole-tarification-horaire"
    base, grid = ods_all(host, ds_base), ods_all(host, ds_grid)
    gi = {norm(g["nom_parking"]): g for g in grid}
    parkings = []
    for r in base:
        shape = r.get("geo_shape") or {}
        coords = ((shape.get("geometry") or {}).get("coordinates")
                  if "geometry" in shape else shape.get("coordinates"))
        if not coords or len(coords) < 2:
            continue
        g = gi.get(norm(r.get("nom")))
        tar = blank()
        # la grille dediee prime ; le jeu metropolitain complete les trous
        if g:
            for key, dur in [("30min", "30min"), ("1h", "1h"), ("2h", "2h"), ("3h", "3h")]:
                tar[dur] = fnum(g.get(key))
        for key, dur in [("tarif_1h", "1h"), ("tarif_2h", "2h"), ("tarif_3h", "3h"),
                         ("tarif_4h", "4h"), ("tarif_24h", "24h")]:
            if tar[dur] is None:
                tar[dur] = fnum(r.get(key))
        native = []
        if g:
            for key, lbl in [("10min", "10 min"), ("20min", "20 min"), ("30min", "30 min"),
                             ("40min", "40 min"), ("50min", "50 min"), ("1h", "1 h"),
                             ("1h30", "1 h 30"), ("2h", "2 h"), ("2h30", "2 h 30"),
                             ("3h", "3 h"), ("11h", "11 h"), ("nuit_1h", "1 h la nuit")]:
                v = fnum(g.get(key))
                if v is not None:
                    native.append((lbl, v))
        parkings.append({
            "id": r.get("id"), "nom": r.get("nom"), "adr": r.get("adresse"), "url": r.get("url"),
            "lat": coords[1], "lon": coords[0],
            "tar": tar, "grid": native, "street1h": None,
            "places": inum(r.get("nb_places")), "pmr": inum(r.get("nb_pmr")),
            "ev": inum(r.get("nb_voitures_electriques")), "velo": inum(r.get("nb_velo")),
            "moto": inum(r.get("nb_2_rm")), "covoit": inum(r.get("nb_covoit")),
            "haut": (lambda h: h / 100 if h and 100 < h < 400 else None)(inum(r.get("hauteur_max"))),
            "ouvrage": r.get("type_ouvrage"), "ex": None, "niv": None,
            "abo_r": fnum(r.get("abo_resident")), "abo_n": fnum(r.get("abo_non_resident")),
            "info": r.get("info"), "live": None,
        })
    return parkings, {
        "nom": "Nantes Métropole", "court": "Nantes", "jeu": ds_base, "host": host,
        "url": f"https://{host}/explore/dataset/{ds_base}/",
        "maj": ods_modified(host, ds_base), "licence": "Licence Ouverte",
        "grille": ds_grid, "grille_maj": ods_modified(host, ds_grid),
        "live_api": f"https://{host}/api/explore/v2.1/catalog/datasets"
                    f"/244400404_parkings-publics-nantes-disponibilites"
                    f"/records?limit=100&select=grp_nom,grp_disponible,grp_exploitation,grp_horodatage",
        "live_key": "grp_nom",
    }


# --------------------------------------------------------------------------
# Rouen : deux jeux au format national, publies par la metropole elle-meme.
# --------------------------------------------------------------------------
def rouen():
    host = "data.metropole-rouen-normandie.fr"
    sets = ["parkings-en-ouvrage-metropole-rouen-normandie",
            "parkings-relais-metropole-rouen-normandie"]
    parkings = []
    for ds in sets:
        for r in ods_all(host, ds):
            lat, lon = fnum(r.get("ylat")), fnum(r.get("xlong"))
            if lat is None or lon is None:
                continue
            tar = blank()
            for key, dur in [("tarif_1h", "1h"), ("tarif_2h", "2h"), ("tarif_3h", "3h"),
                             ("tarif_4h", "4h"), ("tarif_24h", "24h")]:
                tar[dur] = fnum(r.get(key))
            parkings.append({
                "id": r.get("id"), "nom": r.get("nom"), "adr": r.get("adresse"),
                "url": r.get("url"), "lat": lat, "lon": lon,
                "tar": tar,
                "grid": [(l, tar[d]) for d, l in
                         [("1h", "1 h"), ("2h", "2 h"), ("3h", "3 h"), ("4h", "4 h"),
                          ("24h", "24 h")] if tar[d] is not None],
                "street1h": None,
                "places": inum(r.get("nb_places")), "pmr": inum(r.get("nb_pmr")),
                "ev": inum(r.get("nb_voiture_elec")), "velo": inum(r.get("nb_velo")),
                "moto": inum(r.get("nb_2_rmoto")), "covoit": inum(r.get("nb_covoit")),
                "haut": (lambda h: h / 100 if h and 100 < h < 400 else None)(inum(r.get("hauteur_max"))),
                "ouvrage": "Parking relais" if "relais" in ds else "Ouvrage",
                "ex": None, "niv": None,
                "abo_r": fnum(r.get("abo_resident")), "abo_n": fnum(r.get("abo_non_resident")),
                "info": r.get("info"), "live": None,
            })
    return parkings, {
        "nom": "Métropole Rouen Normandie", "court": "Rouen", "jeu": " + ".join(sets), "host": host,
        "url": f"https://{host}/explore/dataset/{sets[0]}/",
        "maj": ods_modified(host, sets[0]), "licence": "Licence Ouverte",
    }


# --------------------------------------------------------------------------
# Paris : reseau Saemes, publie par l'exploitant au format national.
# --------------------------------------------------------------------------
def paris_saemes():
    url = "https://www.data.gouv.fr/api/1/datasets/r/59044c4a-54fb-4617-b752-532303180d25"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
        raw = r.read()
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            txt = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    delim = ";" if txt.count(";") > txt.count(",") else ","
    parkings = []
    for r in csv.DictReader(io.StringIO(txt), delimiter=delim):
        lat, lon = fnum(r.get("Ylat")), fnum(r.get("Xlong"))
        if lat is None or lon is None:
            continue
        tar = blank()
        for key, dur in [("tarif_1h", "1h"), ("tarif_2h", "2h"), ("tarif_3h", "3h"),
                         ("tarif_4h", "4h"), ("tarif_24h", "24h")]:
            tar[dur] = fnum(r.get(key))
        parkings.append({
            "id": r.get("id"), "nom": r.get("nom"), "adr": r.get("adresse"),
            "url": r.get("url"), "lat": lat, "lon": lon,
            "tar": tar,
            "grid": [(l, tar[d]) for d, l in
                     [("1h", "1 h"), ("2h", "2 h"), ("3h", "3 h"), ("4h", "4 h"),
                      ("24h", "24 h")] if tar[d] is not None],
            "street1h": None,
            "places": inum(r.get("nb_places")), "pmr": inum(r.get("nb_pmr")),
            "ev": inum(r.get("nb_voitures_electriques")), "velo": inum(r.get("nb_velo")),
            "moto": inum(r.get("nb_2_rm")), "covoit": inum(r.get("nb_covoit")),
            "haut": (lambda h: h / 100 if h and 100 < h < 400 else None)(inum(r.get("hauteur_max"))),
            "ouvrage": r.get("type_ouvrage"), "ex": "Saemes", "niv": None,
            "abo_r": fnum(r.get("abo_resident")), "abo_n": fnum(r.get("abo_non_resident")),
            "info": r.get("info"), "live": None,
        })
    return parkings, {
        "nom": "Saemes", "court": "Saemes", "jeu": "Parkings Saemes, format national",
        "host": "transport.data.gouv.fr",
        "url": "https://transport.data.gouv.fr/datasets/parkings-saemes",
        "maj": "2026-08-05", "licence": "Licence Ouverte",
    }


SOURCES = [
    ("bordeaux", "Bordeaux", bordeaux),
    ("nantes", "Nantes", nantes),
    ("rouen", "Rouen", rouen),
    ("paris", "Paris · Saemes", paris_saemes),
]


def geometric_median(points, max_iter=200):
    """Point qui minimise la somme des distances : robuste aux parkings isoles."""
    x = sum(p[0] for p in points) / len(points)
    y = sum(p[1] for p in points) / len(points)
    for _ in range(max_iter):
        nx = ny = w = 0.0
        for px, py in points:
            d = max(math.hypot(px - x, py - y), 1e-6)
            nx += px / d
            ny += py / d
            w += 1 / d
        nx, ny = nx / w, ny / w
        if math.hypot(nx - x, ny - y) < 0.5:
            return [round(nx), round(ny)]
        x, y = nx, ny
    return [round(x), round(y)]


def main():
    out = {}
    for key, ville, loader in SOURCES:
        print(f"\n{ville}...", flush=True)
        parkings, source = loader()

        # Certaines sources reutilisent un identifiant pour deux parkings
        # distincts, d'autres en oublient. On garantit une cle unique et non
        # vide, en conservant l'identifiant d'origine avant le diese pour
        # l'appariement des disponibilites.
        seen = {}
        for n, p in enumerate(parkings):
            if not p.get("id"):
                p["id"] = f"{key}-sans-id-{n}"
                print(f"    identifiant absent de la source : {p['nom']} "
                      f"-> {p['id']}")
            base = str(p["id"])
            seen[base] = seen.get(base, 0) + 1
            if seen[base] > 1:
                p["id"] = f"{base}#{seen[base]}"
                print(f"    identifiant dupliqué dans la source : {base} "
                      f"-> {p['id']} ({p['nom']})")

        for p in parkings:
            p["bad"] = check(p["tar"])
            p["free"] = all(v == 0 for v in p["tar"].values() if v is not None) and \
                        any(v is not None for v in p["tar"].values())
            p["tar"] = {d: (None if p["tar"][d] is None else round(p["tar"][d] * 100))
                        for d in DURATIONS}
            p["grid"] = [[l, round(v * 100)] for l, v in p["grid"]]
            if p["street1h"] is not None:
                p["street1h"] = round(p["street1h"] * 100)

        lat0 = (min(p["lat"] for p in parkings) + max(p["lat"] for p in parkings)) / 2
        lon0 = (min(p["lon"] for p in parkings) + max(p["lon"] for p in parkings)) / 2
        mlon = 111320 * math.cos(math.radians(lat0))
        for p in parkings:
            p["x"] = round((p["lon"] - lon0) * mlon)
            p["y"] = round((p["lat"] - lat0) * -110574)
            p["ll"] = [round(p["lat"], 6), round(p["lon"], 6)]
            del p["lat"], p["lon"]

        start = geometric_median([(p["x"], p["y"]) for p in parkings])
        spread = sorted(math.hypot(p["x"] - start[0], p["y"] - start[1]) for p in parkings)

        cov = {d: sum(1 for p in parkings if p["tar"][d] is not None) for d in DURATIONS}
        bad = sum(1 for p in parkings if p["bad"])
        live = sum(1 for p in parkings if p["live"])
        print(f"  {len(parkings)} parkings | " + " ".join(f"{d}:{cov[d]}" for d in DURATIONS) +
              (f" | {bad} grille(s) incohérente(s)" if bad else "") +
              (f" | {live} en direct" if live else "") +
              f" | source du {source['maj']}")

        out[key] = {"ville": ville, "source": source, "lat0": round(lat0, 6),
                    "lon0": round(lon0, 6), "start": start,
                    "view": max(1300, round(spread[min(8, len(spread)) - 1] * 2.6)),
                    "parkings": parkings}
        time.sleep(0.5)

    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    total = sum(len(c["parkings"]) for c in out.values())
    print(f"\n{OUT_PATH} : {len(out)} villes, {total} parkings")


if __name__ == "__main__":
    main()
