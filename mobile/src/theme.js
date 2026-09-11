// Jetons repris tels quels du CSS de la version web, pour que les deux
// applications se ressemblent vraiment.
const light = {
  ink: '#0A1A2F', ink2: '#22364F', mute: '#61748C', faint: '#93A3B8',
  paper: '#FFFFFF', wash: '#EFF3F8', wash2: '#E3EAF3', line: '#DCE4EE',
  blue: '#0B5CD5', bluePress: '#084AAE', blueSoft: '#E6EFFC',
  free: '#0C8F63', freeSoft: '#E2F4EC',
  warn: '#B4460F', warnSoft: '#FBECE2',
  shadow: 'rgba(10,26,47,0.16)',
  mapStyle: 'standard',
};

const dark = {
  ink: '#EAF1FA', ink2: '#BCCDE2', mute: '#8CA0BA', faint: '#7C90AB',
  paper: '#0E1F33', wash: '#15293F', wash2: '#1D3450', line: '#20364F',
  blue: '#4D95FF', bluePress: '#75AEFF', blueSoft: '#122C4D',
  free: '#3DD39B', freeSoft: '#0D3328',
  warn: '#F08B54', warnSoft: '#37200F',
  shadow: 'rgba(0,0,0,0.5)',
  mapStyle: 'dark',
};

// L'application assume un parti pris clair, comme la version web sur laquelle
// elle est calquée : fond blanc, bleu franc. Le thème sombre reste défini plus
// haut ; passer `true` ici le rebranche sur le réglage du système.
const FOLLOW_SYSTEM = false;

export const palette = (scheme) =>
  (FOLLOW_SYSTEM && scheme === 'dark' ? dark : light);
export const radius = { lg: 22, md: 14, sm: 9 };

// Familjen Grotesk pour les titres et les prix, Instrument Sans pour le reste :
// exactement la paire de la version web.
export const font = {
  display: 'FamiljenGrotesk_700Bold',
  displayMedium: 'FamiljenGrotesk_600SemiBold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemi: 'InstrumentSans_600SemiBold',
};
