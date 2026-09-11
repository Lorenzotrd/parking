// Briques visuelles calquées sur le CSS de la version web.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { font, radius } from './theme';

export function Chip({ label, active, disabled, onPress, c, small }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={[
        small ? s.chipSmall : s.chip,
        { backgroundColor: active ? c.blue : c.wash },
        disabled && { opacity: 0.42 },
      ]}
    >
      <Text
        style={[
          small ? s.chipTextSmall : s.chipText,
          { color: active ? '#FFFFFF' : c.ink2 },
          disabled && { textDecorationLine: 'line-through' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Tag({ label, tone, c }) {
  const tones = {
    free: { bg: c.freeSoft, fg: c.free },
    live: { bg: c.free, fg: '#FFFFFF' },
    warn: { bg: c.warnSoft, fg: c.warn },
    pick: { bg: c.ink, fg: c.paper },
    plain: { bg: c.wash2, fg: c.ink2 },
  };
  const t = tones[tone] || tones.plain;
  return (
    <View style={[s.tag, { backgroundColor: t.bg }]}>
      <Text style={[s.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export const IconTarget = ({ color, size = 19 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2.1} strokeLinecap="round">
    <Circle cx="12" cy="12" r="3.4" />
    <Path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2" />
  </Svg>
);

export const IconChevron = ({ color, size = 15 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 9l6 6 6-6" />
  </Svg>
);

export const IconNav = ({ color, size = 15 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 11l18-8-8 18-2-8-8-2z" />
  </Svg>
);

export const IconCheck = ({ color, size = 15 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 12.5l5 5L20 6.5" />
  </Svg>
);

export const s = StyleSheet.create({
  // rails de filtres
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, marginRight: 6 },
  chipSmall: { paddingHorizontal: 11, paddingVertical: 5.5, borderRadius: 999, marginRight: 6 },
  chipText: { fontFamily: font.bodyMedium, fontSize: 13, letterSpacing: -0.1 },
  chipTextSmall: { fontFamily: font.bodyMedium, fontSize: 12, letterSpacing: -0.1 },

  // étiquettes
  tag: { paddingHorizontal: 5.5, paddingVertical: 2, borderRadius: 4, marginRight: 5, marginTop: 3 },
  tagText: { fontFamily: font.bodySemi, fontSize: 10, letterSpacing: 0.15 },

  // en-tête
  city: { fontFamily: font.display, fontSize: 25, letterSpacing: -0.7, lineHeight: 29 },
  sub: { fontFamily: font.body, fontSize: 12.5, marginTop: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  // lignes de la liste
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    paddingHorizontal: 8, borderRadius: radius.md, gap: 11,
  },
  rank: { fontFamily: font.body, fontSize: 11.5, width: 20, textAlign: 'right' },
  name: { fontFamily: font.bodySemi, fontSize: 14.5, letterSpacing: -0.2 },
  meta: { fontFamily: font.body, fontSize: 11.5, marginTop: 2 },
  price: { fontFamily: font.displayMedium, fontSize: 17, letterSpacing: -0.45, textAlign: 'right' },
  priceUnit: { fontFamily: font.bodyMedium, fontSize: 10.5, marginTop: 1, textAlign: 'right' },

  // feuille de détail
  sheetTitle: { fontFamily: font.display, fontSize: 18, letterSpacing: -0.45 },
  big: { fontFamily: font.display, fontSize: 38, letterSpacing: -1.3 },
  h4: {
    fontFamily: font.displayMedium, fontSize: 11.5, letterSpacing: 0.9,
    textTransform: 'uppercase', marginBottom: 8,
  },
  specLabel: { fontFamily: font.body, fontSize: 10.5, letterSpacing: 0.7, textTransform: 'uppercase' },
  specValue: { fontFamily: font.bodyMedium, fontSize: 13.5, marginTop: 2 },
  body: { fontFamily: font.body, fontSize: 13.5, lineHeight: 20 },
  small: { fontFamily: font.body, fontSize: 11.5, lineHeight: 17 },
  btnLabel: { fontFamily: font.bodySemi, fontSize: 15, letterSpacing: -0.2 },
});
