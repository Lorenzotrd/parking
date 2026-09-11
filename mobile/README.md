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

## Ce que l'app montre

L'écran principal : un prix pour la durée choisie, une distance, les places
libres quand la ville les publie. La fiche d'un parking : le prix en grand, les
places libres, un bouton de navigation, la hauteur sous plafond, la grille
tarifaire complète telle que la ville la publie, une courbe comparant ce parking
au moins cher de la ville, et à Bordeaux la comparaison avec l'horodateur voisin.

Volontairement absents : les abonnements mensuels, les places vélo et moto, les
places PMR, les bornes de recharge, le nombre de niveaux et les explications de
méthode. Un contrôle vérifie qu'aucun champ exporté n'est ignoré par l'interface.

## Couleurs

L'application assume un parti pris clair, fond blanc et bleu franc, comme la
version web dont elle reprend les jetons. Le thème sombre est défini dans
`src/theme.js` mais désactivé : passer `FOLLOW_SYSTEM` à `true` le rebranche sur
le réglage du système.

Le fond de carte suit la même palette. Sur Android, `src/mapStyle.js` applique
un style Google. Sur iOS, Plans ignore les styles personnalisés, on y utilise
donc `mapType="mutedStandard"`, son rendu atténué, qui en est le plus proche.

## Prévisualiser le design sans téléphone

`react-native-maps` n'existe pas sur le web. `src/Map.web.js` fournit un
substitut qui rend un rectangle à la place de la carte, ce qui permet de
contrôler la typographie et la mise en page dans un navigateur :

```bash
npx expo start --web
```

Metro choisit `src/Map.js` sur iOS et Android, donc ce substitut n'entre jamais
dans le paquet mobile.

## Différences avec la version web

| | Web | Mobile |
|---|---|---|
| Fond de carte | SVG dessiné, 3 Mo | tuiles natives, 0 Mo embarqué |
| Position | point à déplacer | GPS réel, appui long pour déplacer |
| Places libres | bloquées par le CSP en Artifact | rafraîchies à l'ouverture et au retour dans l'app |
| Données | 164 Ko | 69 Ko, champs inutiles retirés |
| Typographie | Familjen Grotesk et Instrument Sans | les mêmes, chargées par expo-font |

Le jeu mobile est produit par `python3 build/export_mobile.py` depuis la racine
du dépôt. Relancez-le après toute mise à jour des données.

## Publier sur les stores

Expo Go sert à tester, pas à distribuer. Pour un binaire il faut EAS Build, une
clé Google Maps par plateforme, et les comptes développeur Apple et Google.
Voir la documentation `react-native-maps` pour la configuration des clés.
