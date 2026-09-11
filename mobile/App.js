// Se garer — comparateur de parkings sur données officielles.
// Un seul écran utile : la carte, la liste classée par prix, la fiche.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, AppState, FlatList, Modal, Pressable, ScrollView,
  StyleSheet, Text, useColorScheme, View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

import { palette, radius } from './src/theme';
import {
  CITIES, CITY_KEYS, DURATIONS, DUR_LABEL, bestDuration, coverage,
  distLabel, fetchLive, frDate, nf, priceLabel, rank,
} from './src/lib';
import { Chip, Tag, s } from './src/ui';
import CityScreen from './src/CityScreen';
import DetailSheet from './src/DetailSheet';

const RADII = [[500, '500 m'], [1500, '1,5 km'], [4000, '4 km'], [0, 'Tout']];

export default function App() {
  const c = palette(useColorScheme());
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

  const city = CITIES[cityKey];

  // Rafraîchissement des places libres : à l'ouverture et au retour dans l'app.
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

  const rows = useMemo(
    () => rank(cityKey, origin, dur, sort, maxDist, live[cityKey]),
    [cityKey, origin, dur, sort, maxDist, live],
  );

  const switchCity = (key) => {
    setCityKey(key);
    setOrigin(CITIES[key].center);
    setPicked(null);
    if (coverage(key, dur) === 0) setDur(bestDuration(key));
    setShowCities(false);
  };

  const locate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setOrigin([pos.coords.latitude, pos.coords.longitude]);
      }
    } catch {
      // permission refusée ou GPS indisponible : on garde le point courant
    } finally {
      setLocating(false);
    }
  };

  const region = {
    latitude: origin[0], longitude: origin[1],
    latitudeDelta: 0.045, longitudeDelta: 0.045,
  };

  const pickedRow = picked ? rows.find((r) => r.p.id === picked) : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
        <StatusBar style="auto" />

        <View style={st.header}>
          <Pressable onPress={() => setShowCities(true)} style={{ flex: 1 }} accessibilityRole="button">
            <Text style={[s.title, { color: c.ink }]}>{city.ville} ▾</Text>
            <Text style={{ fontSize: 12, color: c.mute, marginTop: 1 }}>
              {rows.length} parking{rows.length > 1 ? 's' : ''} · {city.source.court}
            </Text>
          </Pressable>
          <Pressable
            onPress={locate}
            accessibilityLabel="Me localiser"
            style={[st.locBtn, { backgroundColor: c.wash }]}
          >
            {locating
              ? <ActivityIndicator size="small" color={c.blue} />
              : <Text style={{ fontSize: 17, color: c.blue }}>◎</Text>}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.rail}
                    contentContainerStyle={{ paddingHorizontal: 16 }}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={DUR_LABEL[d]} c={c} active={d === dur}
                  disabled={coverage(cityKey, d) === 0} onPress={() => setDur(d)} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.railThin}
                    contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}>
          {RADII.map(([v, label]) => (
            <Chip key={label} label={label} c={c} small active={v === maxDist}
                  onPress={() => setMaxDist(v)} />
          ))}
          <View style={{ width: 10 }} />
          <Chip label={sort === 'price' ? 'Prix' : 'Distance'} c={c} small active
                onPress={() => setSort(sort === 'price' ? 'dist' : 'price')} />
        </ScrollView>

        <MapView style={{ flex: 1 }} region={region} showsUserLocation
                 onLongPress={(e) => {
                   const { latitude, longitude } = e.nativeEvent.coordinate;
                   setOrigin([latitude, longitude]);
                 }}>
          {rows.slice(0, 40).map((r, i) => (
            <Marker
              key={r.p.id}
              coordinate={{ latitude: r.p.ll[0], longitude: r.p.ll[1] }}
              onPress={() => setOpenRow(r)}
              pinColor={r.cents === 0 ? 'green' : i === 0 && sort === 'price' ? 'blue' : 'red'}
              title={r.p.nom}
              description={`${priceLabel(r.cents)} · ${distLabel(r.dist)}`}
            />
          ))}
        </MapView>

        {pickedRow && (
          <Pressable onPress={() => setOpenRow(pickedRow)}
                     style={[st.picked, { backgroundColor: c.blueSoft, borderColor: c.blue }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: c.blue, letterSpacing: 0.5 }}>
                PARKING CHOISI
              </Text>
              <Text style={{ fontSize: 14.5, fontWeight: '600', color: c.ink }} numberOfLines={1}>
                {pickedRow.p.nom}
              </Text>
              <Text style={{ fontSize: 12, color: c.mute }}>
                {distLabel(pickedRow.dist)} · {priceLabel(pickedRow.cents)}
              </Text>
            </View>
          </Pressable>
        )}

        <View style={[st.listWrap, { backgroundColor: c.paper, borderTopColor: c.line }]}>
          <FlatList
            data={rows}
            keyExtractor={(r) => String(r.p.id)}
            ListEmptyComponent={
              <Text style={{ padding: 20, color: c.mute, fontSize: 13, lineHeight: 19 }}>
                Aucun parking dans ce rayon. Élargissez la distance, ou restez appuyé sur la carte
                pour déplacer le point.
              </Text>
            }
            renderItem={({ item, index }) => (
              <Pressable onPress={() => setOpenRow(item)} style={s.row} accessibilityRole="button">
                <Text style={{ width: 20, fontSize: 12, color: c.faint, textAlign: 'right' }}>
                  {index + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { color: c.ink }]} numberOfLines={1}>{item.p.nom}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={[s.meta, { color: c.mute, marginRight: 6 }]}>
                      {distLabel(item.dist)}
                      {item.p.places ? ` · ${nf.format(item.p.places)} places` : ''}
                    </Text>
                    {item.live && <Tag label={`${nf.format(item.live.libres)} libres`} tone="live" c={c} />}
                    {item.cents === 0 && <Tag label="Gratuit" tone="free" c={c} />}
                  </View>
                </View>
                <Text style={[s.price, {
                  color: item.cents === 0 ? c.free : item.cents == null ? c.faint : c.ink,
                }]}>
                  {item.cents == null ? '—' : priceLabel(item.cents)}
                </Text>
              </Pressable>
            )}
          />
        </View>

        <Modal visible={showCities} animationType="slide" presentationStyle="pageSheet"
               onRequestClose={() => setShowCities(false)}>
          <View style={{ flex: 1, backgroundColor: c.paper }}>
            <View style={[st.header, { borderBottomWidth: 1, borderBottomColor: c.line }]}>
              <Text style={[s.title, { color: c.ink, flex: 1, fontSize: 20 }]}>Où cherchez-vous ?</Text>
              <Pressable onPress={() => setShowCities(false)} hitSlop={10}>
                <Text style={{ color: c.blue, fontWeight: '600', fontSize: 15 }}>Fermer</Text>
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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 6, paddingBottom: 10, gap: 12,
  },
  locBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rail: { flexGrow: 0, paddingBottom: 8 },
  railThin: { flexGrow: 0, paddingBottom: 10 },
  listWrap: { height: '42%', borderTopWidth: 1 },
  picked: {
    position: 'absolute', left: 12, right: 12, bottom: '43%',
    padding: 11, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row',
  },
});
