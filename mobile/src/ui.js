// Briques visuelles partagées.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius } from './theme';

export function Chip({ label, active, disabled, onPress, c, small }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      style={[
        s.chip,
        small && s.chipSmall,
        { backgroundColor: active ? c.blue : c.wash },
        disabled && { opacity: 0.38 },
      ]}
    >
      <Text
        style={[
          s.chipText,
          { color: active ? '#fff' : c.ink2 },
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
    live: { bg: c.free, fg: '#fff' },
    warn: { bg: c.warnSoft, fg: c.warn },
    plain: { bg: c.wash2, fg: c.ink2 },
  };
  const t = tones[tone] || tones.plain;
  return (
    <View style={[s.tag, { backgroundColor: t.bg }]}>
      <Text style={[s.tagText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 6,
  },
  chipSmall: { paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontSize: 13.5, fontWeight: '600', letterSpacing: -0.1 },
  tag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginRight: 5, marginTop: 3,
  },
  tagText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.1 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8 },
  price: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 14, borderRadius: radius.md, gap: 12,
  },
  name: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  meta: { fontSize: 12, marginTop: 2 },
});
