// Courbe du tarif selon la durée, tracée à la même échelle que la version web :
// la ligne du parking, celle du moins cher de la ville en pointillés, et un
// point sur la durée sélectionnée.
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { CITIES, DURATIONS, DUR_LABEL, money } from './lib';
import { font } from './theme';
import { s } from './ui';

export default function Chart({ parking, cityKey, dur, c, width }) {
  const known = DURATIONS.map((d, i) => [i, parking.tar[d]]).filter(([, v]) => v != null);
  if (known.length < 2) return null;

  // référence : le parking de la ville dont la grille complète est la moins chère
  let cheapest = null;
  let best = Infinity;
  for (const q of CITIES[cityKey].parkings) {
    if (q.id === parking.id) continue;
    if (!DURATIONS.every((d) => q.tar[d] != null)) continue;
    const sum = DURATIONS.reduce((a, d) => a + q.tar[d], 0);
    if (sum > 0 && sum < best) { best = sum; cheapest = q; }
  }

  const values = known.map(([, v]) => v)
    .concat(cheapest ? DURATIONS.map((d) => cheapest.tar[d]) : []);
  const maxY = Math.max(200, ...values);

  // marge à gauche pour que l'étiquette « 30 min » ne soit pas coupée,
  // et à droite pour les graduations de prix
  const padLeft = 18;
  const padRight = 46;
  const h = 108;
  const w = Math.max(120, width - padLeft - padRight);
  const sx = (i) => padLeft + (i / (DURATIONS.length - 1)) * w;
  const sy = (v) => h - (v / maxY) * h;
  const line = (pts) => pts.map(([i, v], n) => `${n ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');

  const area = `${line(known)} L${sx(known[known.length - 1][0]).toFixed(1)} ${h} L${sx(known[0][0]).toFixed(1)} ${h} Z`;
  const right = padLeft + w;
  const curIndex = DURATIONS.indexOf(dur);
  const curValue = parking.tar[dur];

  return (
    <View>
      <Svg width={width} height={h + 26}>
        <Line x1={padLeft} y1={h} x2={right} y2={h} stroke={c.line} strokeWidth="1" />
        <Line x1={padLeft} y1="0" x2={right} y2="0" stroke={c.line} strokeWidth="1" strokeDasharray="3 4" />
        <SvgText x={right + 5} y="9" fontSize="10" fill={c.faint} fontFamily={font.body}>
          {money(Math.round(maxY))}
        </SvgText>
        <SvgText x={right + 5} y={h + 3} fontSize="10" fill={c.faint} fontFamily={font.body}>0 €</SvgText>
        {cheapest && (
          <Path d={line(DURATIONS.map((d, i) => [i, cheapest.tar[d]]))}
                fill="none" stroke={c.faint} strokeWidth="1.6" strokeDasharray="4 4" />
        )}
        <Path d={area} fill={c.blue} fillOpacity={0.11} />
        <Path d={line(known)} fill="none" stroke={c.blue} strokeWidth="2.4"
              strokeLinejoin="round" strokeLinecap="round" />
        {DURATIONS.map((d, i) => (
          <G key={d}>
            <SvgText x={sx(i)} y={h + 17} fontSize="9.5" fill={c.faint}
                     textAnchor="middle" fontFamily={font.body}>
              {DUR_LABEL[d]}
            </SvgText>
          </G>
        ))}
        {curValue != null && (
          <Circle cx={sx(curIndex)} cy={sy(curValue)} r="4.5"
                  fill={c.blue} stroke={c.paper} strokeWidth="2" />
        )}
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
        <Legend color={c.blue} label={parking.nom} c={c} />
        {cheapest && <Legend color={c.faint} label={`${cheapest.nom}, le moins cher`} c={c} dashed />}
      </View>
    </View>
  );
}

const Legend = ({ color, label, c }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <View style={{ width: 14, height: 2.5, borderRadius: 2, backgroundColor: color }} />
    <Text style={[s.small, { color: c.mute }]} numberOfLines={1}>{label}</Text>
  </View>
);
