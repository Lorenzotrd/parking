// Choix de la ville. Quatre lignes, la source et sa date : rien d'autre.
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CITIES, CITY_KEYS, frDate, nf } from './lib';
import { radius } from './theme';

export default function CityScreen({ c, current, onPick }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 13, color: c.mute, marginBottom: 14, lineHeight: 19 }}>
        Quatre villes dont le portail publie des tarifs officiels tenus à jour.
      </Text>
      {CITY_KEYS.map((key) => {
        const city = CITIES[key];
        const live = city.parkings.filter((p) => p.live).length;
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
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: c.ink, letterSpacing: -0.4 }}>
                {city.ville}
              </Text>
              <Text style={{ fontSize: 19, fontWeight: '700', color: c.blue }}>
                {city.parkings.length}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: c.mute, marginTop: 3 }}>
              {city.source.court} · données du {frDate(city.source.maj)}
              {live ? ` · ${live} en direct` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
