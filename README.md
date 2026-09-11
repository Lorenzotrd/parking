# Se garer en France

Comparateur de parkings. Une carte de France sert de point d'entrée : on touche
une ville, on pose son point sur le plan, on choisit une durée, et les parkings
se classent du moins cher au plus cher. On en sélectionne un, et le bouton
d'itinéraire l'ouvre dans Google Maps, Waze ou Plans.

Application d'une seule page, sans dépendance, sans build JavaScript.

## La carte de France

L'écran d'entrée est une carte du pays. Quatre villes en bleu sont couvertes par
des tarifs officiels à jour. Quinze autres apparaissent en gris : leur portail a
été vérifié, mais il publie des parkings sans prix, ou des prix trop anciens.
C'est une information en soi, la donnée ouverte du stationnement est très inégale
d'une ville à l'autre.

## Une source par ville

Chaque ville est lue **au portail qui fixe ses prix**. L'application affiche pour
chacune le nom du jeu de données et sa date de mise à jour, et chaque fiche
renvoie vers la source.

| Ville | Parkings | Places | Jeu de données | Tarifs |
|---|---:|---:|---|---:|
| Bordeaux | 99 | 43 066 | `st_park_p` | 86 |
| Nantes | 89 | 18 190 | lieux de stationnement | 89 |
| Rouen | 30 | 7 043 | ouvrage et parkings relais | 9 |
| Paris | 64 | 28 603 | réseau Saemes | 37 |

Bordeaux et Nantes publient en plus le nombre de places libres en continu.

## Pourquoi pas la base nationale

La première version lisait la Base Nationale des Lieux de Stationnement, la
compilation publiée par le Point d'Accès National. Contrôlée parking par parking
contre la grille officielle de Nantes Métropole, sur 33 parkings appariés par
nom exact :

- 32 tarifs sur 33 étaient faux ;
- sous-évaluation médiane de 18 % ;
- deux parkings payants étaient annoncés gratuits, dont le premier du classement.

Ce fichier n'avait pas été rafraîchi depuis un an. Les portails des métropoles,
eux, le sont en continu, parfois quotidiennement. D'où ce virage.

Vérifié également : le jeu national d'Indigo couvre 558 parkings mais sa table
de tarifs est vide. Saint-Étienne, Angers et Strasbourg publient des parkings
sans aucun prix. Il n'existe aujourd'hui aucune source nationale de tarifs à jour.

## Ce que l'app ne fait pas

- **Aucun itinéraire n'est calculé.** Les distances affichées sont mesurées à vol
  d'oiseau depuis le point posé sur la carte. La route réelle est plus longue, et
  c'est le bouton d'itinéraire qui la donne.
- **Les durées sont celles de chaque source**, rien n'est interpolé. Une durée
  qu'une ville ne publie pas apparaît barrée et désactivée.
- **Le stationnement en voirie n'est pas couvert**, sauf à Bordeaux où la source
  donne le tarif de l'horodateur autour de chaque parking, ce qui permet de
  comparer le parking et la rue.

Quand une source ne renseigne pas un champ, l'application écrit « non renseigné »
plutôt que de combler le trou. Quand une grille est incohérente, par exemple un
tarif qui baisse alors que la durée augmente, elle l'affiche telle quelle avec un
avertissement, sans la corriger.

## Les places libres

Bordeaux et Nantes exposent des API de disponibilité, avec l'en-tête
`Access-Control-Allow-Origin: *`. L'application tente un appel au chargement :

- servie depuis un hébergeur ordinaire, l'appel aboutit et les compteurs sont réels ;
- publiée en Artifact claude.ai, le CSP bloque l'appel, qui échoue en silence, et
  l'application conserve le dernier relevé embarqué.

Dans les deux cas, le compteur n'est affiché que s'il a moins de trois heures.

## Reconstruire les données

```bash
python3 build/extract_cities.py   # portails des villes -> data/cities.json
python3 build/build_maps.py       # OpenStreetMap       -> data/maps.json
python3 build/slim_maps.py        # allège les fonds de carte
python3 build/build_france.py     # contours du pays    -> data/france.json
python3 build/assemble.py         # gabarit + données   -> index.html
```

Seule la bibliothèque standard de Python 3 est nécessaire. Le second script
interroge Overpass et prend quelques minutes ; il reprend là où il s'est arrêté
si `data/maps.json` existe déjà.

Pour ajouter une ville, écrivez une fonction d'adaptation dans
`build/extract_cities.py`, ajoutez-la à `SOURCES`, puis retirez la ville de la
liste `CHECKED` de `build/build_france.py`. Cherchez d'abord si son portail
publie une grille tarifaire datée : sans elle, la ville n'a pas sa place ici.

## Structure

```
index.html              page autonome, servie telle quelle
favicon.svg
vercel.json
src/app.template.html   le gabarit, avec les marqueurs __MAPS__ et __CITIES__
build/                  les cinq scripts de génération
data/cities.json        parkings extraits, projetés en mètres
data/maps.json          fonds de carte des villes, en chemins SVG
data/france.json        contours du pays et villes vérifiées
dist/artifact.html      variante sans <head>, pour publication en Artifact
```

## Déploiement

Site statique : aucune commande de build, rien à installer. Sur Vercel, importez
le dépôt et laissez le preset « Other » avec un répertoire de sortie à la racine.
`vercel.json` s'occupe des en-têtes. La page pèse 2,8 Mo, soit environ 1,2 Mo
transférés une fois compressée.

## Licence

Le code est libre d'usage. Les données restent sous leurs licences respectives :
Licence Ouverte pour Bordeaux Métropole, Nantes Métropole, Métropole Rouen
Normandie et Saemes, ODbL pour OpenStreetMap et pour les contours communaux. Toute réutilisation doit conserver
ces attributions.
