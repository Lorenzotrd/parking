// Palette de carte reprise du fond SVG de la version web : terre bleu très
// pâle, routes blanches, eau turquoise, parcs vert tendre.
//
// Ce style ne s'applique qu'au fournisseur Google, donc à Android. Sur iOS,
// Plans ignore les styles personnalisés : on y passe par mapType
// « mutedStandard », le rendu atténué d'Apple, qui est le plus proche.
const geom = (color) => ({ elementType: 'geometry', stylers: [{ color }] });

export const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#E8EEF5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#61748C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 2 }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', ...geom('#DDEAD9') },
  { featureType: 'landscape.man_made', ...geom('#EFF3F8') },
  { featureType: 'road', ...geom('#FFFFFF') },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#DCE4EE' }] },
  { featureType: 'road.local', ...geom('#F7FAFD') },
  { featureType: 'road.arterial', ...geom('#FFFFFF') },
  { featureType: 'road.highway', ...geom('#FFFFFF') },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#C7D6E4' }] },
  { featureType: 'water', ...geom('#9FD6E2') },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3E7C8A' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#DCE4EE' }] },
];
