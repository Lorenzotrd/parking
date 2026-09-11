// Identité bleu et blanc, identique à la version web.
const light = {
  ink: '#0A1A2F', ink2: '#22364F', mute: '#61748C', faint: '#93A3B8',
  paper: '#FFFFFF', wash: '#EFF3F8', wash2: '#E3EAF3', line: '#DCE4EE',
  blue: '#0B5CD5', blueSoft: '#E6EFFC',
  free: '#0C8F63', freeSoft: '#E2F4EC',
  warn: '#B4460F', warnSoft: '#FBECE2',
};

const dark = {
  ink: '#EAF1FA', ink2: '#BCCDE2', mute: '#8CA0BA', faint: '#61748C',
  paper: '#0E1F33', wash: '#071322', wash2: '#15293F', line: '#20364F',
  blue: '#4D95FF', blueSoft: '#122C4D',
  free: '#3DD39B', freeSoft: '#0D3328',
  warn: '#F08B54', warnSoft: '#37200F',
};

export const palette = (scheme) => (scheme === 'dark' ? dark : light);
export const radius = { lg: 20, md: 14, sm: 9 };
