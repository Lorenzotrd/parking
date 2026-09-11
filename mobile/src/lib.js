// Formatage et calculs. Aucune estimation : la distance est une mesure à vol
// d'oiseau, et le trajet réel est délégué à l'application de navigation.
import data from '../assets/cities.json';

export const CITIES = data;
export const CITY_KEYS = ['bordeaux', 'nantes', 'rouen', 'paris'].filter((k) => data[k]);
export const DURATIONS = ['30min', '1h', '2h', '3h', '4h', '24h'];
export const DUR_LABEL = {
  '30min': '30 min', '1h': '1 h', '2h': '2 h',
  '3h': '3 h', '4h': '4 h', '24h': '24 h',
};

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const eurosRound = new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});
export const nf = new Intl.NumberFormat('fr-FR');

export const money = (cents) =>
  cents % 100 === 0 ? eurosRound.format(cents / 100) : euros.format(cents / 100);

export const priceLabel = (cents) =>
  cents == null ? '—' : cents === 0 ? 'gratuit' : money(cents);

export const distLabel = (metres) =>
  metres < 1000
    ? `${Math.round(metres / 10) * 10} m`
    : `${(metres / 1000).toFixed(1).replace('.', ',')} km`;

export function frDate(iso) {
  if (!iso) return '';
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const [y, m, d] = iso.split('-');
  return `${+d} ${months[+m - 1]} ${y}`;
}

// Distance orthodromique, en mètres.
export function distance([lat1, lon1], [lat2, lon2]) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export const coverage = (cityKey, dur) =>
  CITIES[cityKey].parkings.filter((p) => p.tar && p.tar[dur] != null).length;

export const bestDuration = (cityKey) =>
  DURATIONS.reduce((a, d) => (coverage(cityKey, d) > coverage(cityKey, a) ? d : a), DURATIONS[0]);

// Un relevé de disponibilité n'est montré que s'il est récent.
export function freshCount(parking, liveOverride) {
  const live = (liveOverride && liveOverride[parking.id]) || parking.live;
  if (!live || live.libres == null || !live.at) return null;
  const hours = (Date.now() - new Date(live.at).getTime()) / 36e5;
  if (!isFinite(hours) || hours > 3) return null;
  return { ...live, hours };
}

export function rank(cityKey, origin, dur, sort, maxDist, live) {
  const rows = CITIES[cityKey].parkings.map((p) => ({
    p,
    dist: distance(origin, p.ll),
    cents: p.tar ? p.tar[dur] ?? null : null,
    live: freshCount(p, live),
  }));
  const filtered = maxDist ? rows.filter((r) => r.dist <= maxDist) : rows;
  const key = (r) => (r.cents == null ? 1e9 : r.cents);
  filtered.sort((a, b) =>
    sort === 'price' ? key(a) - key(b) || a.dist - b.dist : a.dist - b.dist || key(a) - key(b));
  return filtered;
}

// Les portails autorisent l'appel direct : pas de proxy nécessaire.
export async function fetchLive(cityKey) {
  const src = CITIES[cityKey].source;
  if (!src.live_api) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(src.live_api, { signal: controller.signal });
    if (!res.ok) return null;
    const { results = [] } = await res.json();
    const slug = (s) => String(s || '').normalize('NFD')
      .replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const byId = {}, byName = {};
    for (const p of CITIES[cityKey].parkings) {
      // l'identifiant d'origine est ce qui précède le suffixe de doublon
      byId[String(p.id).split('#')[0]] = p;
      byName[slug(p.nom)] = p;
    }
    const found = {};
    for (const row of results) {
      const match = byId[String(row[src.live_key])] || byName[slug(row[src.live_key])];
      if (!match || row.connecte === 0) continue;
      const libres = row.libres ?? row.grp_disponible;
      if (libres == null) continue;
      found[match.id] = {
        libres,
        total: row.total ?? row.grp_exploitation,
        at: row.mdate || row.grp_horodatage,
      };
    }
    return Object.keys(found).length ? found : null;
  } catch {
    return null; // hors ligne : on garde le dernier relevé embarqué
  } finally {
    clearTimeout(timer);
  }
}
