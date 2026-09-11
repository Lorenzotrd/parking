# Se garer — application mobile

Version Expo du comparateur. Mêmes données officielles que la version web,
interface réduite à ce qu'un conducteur regarde en roulant.

## Lancer sur son téléphone

```bash
cd mobile
npm install
npx expo start
```

Scannez le QR code avec **Expo Go**. Aucune clé d'API n'est nécessaire pour
tester : `react-native-maps` est inclus dans Expo Go.

## Ce que l'app montre, et rien d'autre

Un prix pour la durée choisie, une distance, les places libres quand la ville
les publie, et un bouton qui lance la navigation. La fiche ajoute la hauteur
sous plafond, le nombre de places et, à Bordeaux, la comparaison avec
l'horodateur voisin.

Volontairement absents : les abonnements mensuels, les places vélo et moto, le
nombre de niveaux, les grilles tarifaires complètes et les explications de
méthode. Tout cela vit dans la version web, où l'on a le temps de lire.

## Différences avec la version web

| | Web | Mobile |
|---|---|---|
| Fond de carte | SVG dessiné, 3 Mo | tuiles natives, 0 Mo embarqué |
| Position | point à déplacer | GPS réel, appui long pour déplacer |
| Places libres | bloquées par le CSP en Artifact | rafraîchies à l'ouverture et au retour dans l'app |
| Données | 164 Ko | 73 Ko, champs inutiles retirés |

Le jeu mobile est produit par `python3 build/export_mobile.py` depuis la racine
du dépôt. Relancez-le après toute mise à jour des données.

## Publier sur les stores

Expo Go sert à tester, pas à distribuer. Pour un binaire il faut EAS Build, une
clé Google Maps par plateforme, et les comptes développeur Apple et Google.
Voir la documentation `react-native-maps` pour la configuration des clés.
