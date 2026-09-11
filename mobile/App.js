// Se garer — comparateur de parkings sur données officielles.
// Même identité visuelle que la version web : bleu et blanc, Familjen Grotesk
// pour les titres et les prix, Instrument Sans pour le reste.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, AppState, FlatList, Modal, Pressable, ScrollView,
  StyleSheet, Text, useColorScheme, View,
} from 'react-native';
import MapView, { Marker } from './src/Map';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import {
  FamiljenGrotesk_600SemiBold, FamiljenGrotesk_700Bold,
} from '@expo-google-fonts/familjen-grotesk';
import {
  InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';

import { font, palette, radius } from './src/theme';
import {
  CITIES, CITY_KEYS, DURATIONS, DUR_LABEL, bestDuration, coverage,
  distLabel, fetchLive, nf, priceLabel, rank,
} from './src/lib';
import { Chip, IconChevron, IconTarget, Tag, s } from './src/ui';
import CityScreen from './src/CityScreen';
import DetailSheet from './src/DetailSheet';

const RADII = [[500, '500 m'], [1500, '1,5 km'], [4000, '4 km'], [0, 'Tout']];
const ZOOM = { latitudeDelta: 0.035, longitudeDelta: 0.035 };

export default function App() {
  const scheme = useColorScheme();
  const c = palette(scheme);
  const [fontsReady] = useFonts({
    FamiljenGrotesk_600SemiBold, FamiljenGrotesk_700Bold,
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
  });

  const [cityKey, setCityKey] = useState(CITY_KEYS[0]);
  const [dur, setDur] = useState('1h');
  const [sort, setSort] = useState('price');
  const [maxDist, setMaxDist] = useState(1500);
  const [origin, setOrigin] = useState(CITIES[CITY_KEYS[0]].center);
  const [live, setLive] = useState({});
  const [openRow, setOpenRow] = useState(null);
  const [picked, setPicked] = useState(null);
  const [showCities, setShowCities] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);

  const city = CITIES[cityKey];

  const refresh = useCallback(async (key) => {
    const found = await fetchLive(key);
    if (found) setLive((prev) => ({ ...prev, [key]: found }));
  }, []);

  useEffect(() => { refresh(cityKey); }, [cityKey, refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh(cityKey);
    });
    return () => sub.remove();
  }, [cityKey, refresh]);

  // La carte n'est pas pilotée en continu : on l'anime seulement quand le point
  // de départ change, sinon elle se recentrerait sous les doigts.
  const moveTo = useCallback((coords) => {
    mapRef.current?.animateToRegion(
      { latitude: coords[0], longitude: coords[1], ...ZOOM }, 350);
  }, []);

  const rows = useMemo(
    () => rank(cityKey, origin, dur, sort, maxDist, live[cityKey]),
    [cityKey, origin, dur, sort, maxDist, live],
  );

  const switchCity = (key) => {
    const next = CITIES[key].center;
    setCityKey(key);
    setOrigin(next);
    setPicked(null);
    if (coverage(key, dur) === 0) setDur(bestDuration(key));
    setShowCities(false);
    setTimeout(() => moveTo(next), 60);
  };

  const locate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const next = [pos.coords.latitude, pos.coords.longitude];
        setOrigin(next);
        moveTo(next);
      }
    } catch {
      // permission refusée ou GPS indisponible : on garde le point courant
    } finally {
      setLocating(false);
    }
  };

  if (!fontsReady) {
    return (
      <View style={{ flex: 1, backgroundColor: c.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.blue} />
      </View>
    );
  }

  const pickedRow = picked ? rows.find((r) => r.p.id === picked) : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

        <View style={st.header}>
          <Pressable onPress={() => setShowCities(true)} accessibilityRole="button"
                     style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ flexShrink: 1 }}>
              <Text style={[s.city, { color: c.ink }]} numberOfLines={1}>{city.ville}</Text>
              <Text style={[s.sub, { color: c.mute }]}>
                {rows.length} parking{rows.length > 1 ? 's' : ''} · {city.source.court}
              </Text>
            </View>
            <View style={{ marginTop: -10 }}><IconChevron color={c.mute} /></View>
          </Pressable>
          <Pressable onPress={locate} accessibilityLabel="Me localiser"
                     style={[s.iconBtn, { backgroundColor: c.wash }]}>
            {locating ? <ActivityIndicator size="small" color={c.blue} />
                      : <IconTarget color={c.ink2} />}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={st.rail} contentContainerStyle={st.railInner}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={DUR_LABEL[d]} c={c} active={d === dur}
                  disabled={coverage(cityKey, d) === 0} onPress={() => setDur(d)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={st.railThin} contentContainerStyle={st.railInner}>
          <Text style={[st.railLabel, { color: c.faint }]}>RAYON</Text>
          {RADII.map(([v, label]) => (
            <Chip key={label} label={label} c={c} small active={v === maxDist}
                  onPress={() => setMaxDist(v)} />
          ))}
          <View style={{ width: 8 }} />
          <Chip label={sort === 'price' ? 'Moins cher' : 'Plus proche'} c={c} small active
                onPress={() => setSort(sort === 'price' ? 'dist' : 'price')} />
        </ScrollView>

        <View style={[st.mapWrap, { borderColor: c.line }]}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{ latitude: origin[0], longitude: origin[1], ...ZOOM }}
            userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}
            showsUserLocation
            showsPointsOfInterest={false}
            showsCompass={false}
            toolbarEnabled={false}
            onLongPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setOrigin([latitude, longitude]);
            }}
          >
            <Marker coordinate={{ latitude: origin[0], longitude: origin[1] }}
                    title="Point de départ" pinColor="purple" />
            {rows.slice(0, 40).map((r, i) => (
              <Marker
                key={r.p.id}
                coordinate={{ latitude: r.p.ll[0], longitude: r.p.ll[1] }}
                onCalloutPress={() => setOpenRow(r)}
                onPress={() => setOpenRow(r)}
                title={r.p.nom}
                description={`${priceLabel(r.cents)} · ${distLabel(r.dist)}`}
              >
                <View style={[
                  st.pin,
                  {
                    backgroundColor: r.cents === 0 ? c.free
                      : i === 0 && sort === 'price' ? c.blue : c.paper,
                    borderColor: c.paper,
                    shadowColor: c.shadow,
                  },
                ]}>
                  <Text style={[
                    st.pinText,
                    {
                      color: r.cents === 0 || (i === 0 && sort === 'price')
                        ? '#FFFFFF' : c.ink,
                    },
                  ]}>
                    {r.cents == null ? '?' : r.cents === 0 ? 'gratuit' : priceLabel(r.cents)}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>

          <Text style={[st.hint, { color: c.ink2, backgroundColor: c.paper, shadowColor: c.shadow }]}>
            Restez appuyé sur la carte pour déplacer le point.
          </Text>
        </View>

        <View style={[st.listWrap, { backgroundColor: c.paper, borderTopColor: c.line }]}>
          {pickedRow && (
            <Pressable onPress={() => setOpenRow(pickedRow)}
                       style={[st.picked, { backgroundColor: c.blueSoft, borderColor: c.blue }]}>
              <View style={{ flex: 1 }}>
                <Text style={[st.pickedLabel, { color: c.blue }]}>PARKING CHOISI</Text>
                <Text style={[s.name, { color: c.ink, marginTop: 1 }]} numberOfLines={1}>
                  {pickedRow.p.nom}
                </Text>
                <Text style={[s.meta, { color: c.mute }]}>
                  {distLabel(pickedRow.dist)} · {priceLabel(pickedRow.cents)}
                </Text>
              </View>
            </Pressable>
          )}

          <FlatList
            data={rows}
            keyExtractor={(r) => String(r.p.id)}
            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
            ListEmptyComponent={
              <Text style={[s.body, { color: c.mute, padding: 18 }]}>
                Aucun parking dans ce rayon. Élargissez la distance, ou restez appuyé sur la
                carte pour déplacer le point.
              </Text>
            }
            renderItem={({ item, index }) => (
              <Pressable onPress={() => setOpenRow(item)} accessibilityRole="button"
                         style={({ pressed }) => [s.row, pressed && { backgroundColor: c.wash }]}>
                <Text style={[s.rank, { color: c.faint }]}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { color: c.ink }]} numberOfLines={1}>{item.p.nom}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={[s.meta, { color: c.mute, marginRight: 6 }]}>
                      {distLabel(item.dist)}
                      {item.p.places ? ` · ${nf.format(item.p.places)} places` : ''}
                    </Text>
                    {item.live && <Tag label={`${nf.format(item.live.libres)} libres`} tone="live" c={c} />}
                    {item.cents === 0 && <Tag label="Gratuit" tone="free" c={c} />}
                    {picked === item.p.id && <Tag label="Choisi" tone="pick" c={c} />}
                  </View>
                </View>
                <View>
                  <Text style={[s.price, {
                    color: item.cents === 0 ? c.free : item.cents == null ? c.faint : c.ink,
                  }]}>
                    {item.cents == null ? '—' : priceLabel(item.cents)}
                  </Text>
                  {item.cents != null && (
                    <Text style={[s.priceUnit, { color: c.mute }]}>{DUR_LABEL[dur]}</Text>
                  )}
                </View>
              </Pressable>
            )}
          />
        </View>

        <Modal visible={showCities} animationType="slide" presentationStyle="pageSheet"
               onRequestClose={() => setShowCities(false)}>
          <View style={{ flex: 1, backgroundColor: c.paper }}>
            <View style={[st.modalBar, { borderBottomColor: c.line }]}>
              <Text style={[s.sheetTitle, { color: c.ink, flex: 1 }]}>Où cherchez-vous ?</Text>
              <Pressable onPress={() => setShowCities(false)} hitSlop={10}>
                <Text style={[s.btnLabel, { color: c.blue }]}>Fermer</Text>
              </Pressable>
            </View>
            <CityScreen c={c} current={cityKey} onPick={switchCity} />
          </View>
        </Modal>

        <DetailSheet
          row={openRow} city={city} dur={dur} c={c} picked={picked}
          onClose={() => setOpenRow(null)}
          onPick={(id) => { setPicked(id); setOpenRow(null); }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
    paddingTop: 4, paddingBottom: 10, gap: 12,
  },
  rail: { flexGrow: 0, paddingBottom: 9 },
  railThin: { flexGrow: 0, paddingBottom: 11 },
  railInner: { paddingHorizontal: 18, alignItems: 'center' },
  railLabel: { fontFamily: font.body, fontSize: 10.5, letterSpacing: 0.8, marginRight: 8 },
  mapWrap: { flex: 1, borderTopWidth: 1, borderBottomWidth: 1, overflow: 'hidden' },
  pin: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1.5,
    shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  pinText: { fontFamily: font.bodySemi, fontSize: 12, letterSpacing: -0.2 },
  hint: {
    position: 'absolute', left: 12, bottom: 12, fontFamily: font.body, fontSize: 11,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden',
    shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  listWrap: { height: '40%', borderTopWidth: 1 },
  picked: {
    margin: 10, marginBottom: 4, padding: 11, borderRadius: radius.md,
    borderWidth: 1, flexDirection: 'row',
  },
  pickedLabel: { fontFamily: font.bodySemi, fontSize: 10, letterSpacing: 0.8 },
  modalBar: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, gap: 12,
  },
});
