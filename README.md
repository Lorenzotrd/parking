# Se garer en France

Comparateur de parkings sur sept villes françaises. On pose son point de départ
sur la carte, on choisit une durée, et les parkings se classent du moins cher au
plus cher avec le temps de marche. On en sélectionne un, et le bouton d'itinéraire
l'ouvre dans Google Maps, Waze ou Plans.

Application d'une seule page, sans dépendance, sans build JavaScript.

## Villes couvertes

| Ville | Parkings | Places | Particularité |
|---|---:|---:|---|
| Chambéry | 16 | 3 725 | une grille tarifaire incohérente, signalée dans l'app |
| Poitiers | 8 | 3 311 | |
| Limoges | 8 | 3 479 | couverture tarifaire complète |
| Metz | 15 | 9 726 | couverture tarifaire complète |
| Grenoble | 17 | 6 548 | aucun tarif 2 h dans la base, la durée est désactivée |
| Strasbourg | 24 | 11 554 | |
| Nantes | 51 | 12 415 | onze parkings gratuits |

Total : 139 parkings, 50 758 places.

## D'où viennent les chiffres

Une source unique pour tout ce qui est tarif, capacité, hauteur et équipement :
la [Base Nationale des Lieux de Stationnement](https://www.data.gouv.fr/datasets/base-nationale-des-lieux-de-stationnement),
publiée par le Point d'Accès National transport.data.gouv.fr sous Licence Ouverte.
Chaque fiche affiche l'identifiant du parking dans cette base.

La population des communes vient de l'API Découpage Administratif (données INSEE).
Le fond de carte est dessiné à partir d'OpenStreetMap, sous ODbL.

## Ce que l'app ne fait pas

- **Aucune disponibilité en temps réel.** La page embarque toutes ses données et
  n'appelle aucune API à l'exécution. Le nombre de places libres n'est donc pas affiché.
- **Le temps de marche est estimé**, pas calculé. Distance à vol d'oiseau majorée
  de 28 % pour le détour, à 75 mètres par minute. L'erreur grandit avec la distance.
- **Seules cinq durées existent** : 1, 2, 3, 4 et 24 heures. Ce sont exactement
  celles que la base renseigne. Rien n'est interpolé entre deux points.
- **Le stationnement en voirie n'est pas couvert.** La base ne recense que le
  hors-voirie, et elle n'est pas exhaustive : une ville peut avoir des parkings absents.

Quand un champ est absent de la source, l'app écrit « non renseigné » plutôt que de
combler le trou. Quand une grille est incohérente, par exemple un tarif 2 h inférieur
au tarif 1 h, elle l'affiche telle quelle avec un avertissement, sans la corriger.

## Reconstruire les données

```bash
python3 build/extract_cities.py   # base nationale -> data/cities.json
python3 build/build_maps.py       # OpenStreetMap  -> data/maps.json
python3 build/assemble.py         # gabarit + données -> index.html
```

Seule la bibliothèque standard de Python 3 est nécessaire. Le second script
interroge Overpass et prend quelques minutes ; il reprend là où il s'est arrêté
si `data/maps.json` existe déjà.

Pour ajouter une ville, ajoutez son code INSEE dans `CITIES` au début de
`build/extract_cities.py`, puis relancez les trois étapes. Vérifiez d'abord que la
ville a une couverture tarifaire correcte dans la base, toutes ne l'ont pas.

## Structure

```
index.html              page autonome, servie telle quelle
favicon.svg
vercel.json
src/app.template.html   le gabarit, avec les marqueurs __MAPS__ et __CITIES__
build/                  les trois scripts de génération
data/bnls-v2.csv        la base nationale, brute
data/cities.json        parkings extraits, projetés en mètres
data/maps.json          fonds de carte en chemins SVG
dist/artifact.html      variante sans <head>, pour publication en Artifact claude.ai
```

## Déploiement

Le dépôt est un site statique : aucune commande de build, rien à installer.
Sur Vercel, importez le dépôt et laissez le preset « Other » avec un répertoire
de sortie à la racine. `vercel.json` s'occupe des en-têtes.

## Licence

Le code est libre d'usage. Les données restent sous leurs licences respectives :
Licence Ouverte pour la Base Nationale des Lieux de Stationnement, ODbL pour
OpenStreetMap. Toute réutilisation doit conserver ces attributions.
