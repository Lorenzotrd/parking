// Choix de la ville : le nom, la source, sa date. Rien d'autre.
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CITIES, CITY_KEYS, frDate, nf } from './lib';
import { font, radius } from './theme';
import { s } from './ui';

export default function CityScreen({ c, current, onPick }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[s.body, { color: c.mute, marginBottom: 14 }]}>
        Quatre villes dont le portail publie des tarifs officiels tenus à jour.
      </Text>
      {CITY_KEYS.map((key) => {
        const city = CITIES[key];
        const nLive = city.parkings.filter((p) => p.live).length;
        const active = key === current;
        return (
          <Pressable
            key={key}
            onPress={() => onPick(key)}
            accessibilityRole="button"
            style={{
              padding: 14, borderRadius: radius.md, marginBottom: 8,
              backgroundColor: active ? c.blueSoft : c.paper,
              borderWidth: 1, borderColor: active ? c.blue : c.line,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                fontFamily: font.display, fontSize: 17, color: c.ink, letterSpacing: -0.45,
              }}>
                {city.ville}
              </Text>
              <Text style={[s.meta, { color: c.mute }]}>
                {city.source.court} · {frDate(city.source.maj)}
              </Text>
              <Text style={[s.meta, { color: c.mute }]}>
                {nf.format(city.parkings.reduce((a, p) => a + (p.places || 0), 0))} places
                {nLive ? ` · ${nLive} en direct` : ''}
              </Text>
            </View>
            <Text style={{
              fontFamily: font.displayMedium, fontSize: 19, color: c.blue, letterSpacing: -0.45,
            }}>
              {city.parkings.length}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
