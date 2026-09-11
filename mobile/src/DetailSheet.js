// Fiche d'un parking : le prix, les places libres, comment y aller.
import React from 'react';
import {
  Linking, Modal, Platform, Pressable, ScrollView, Text, useWindowDimensions, View,
} from 'react-native';
import { distLabel, frDate, nf, priceLabel, DURATIONS, DUR_LABEL } from './lib';
import { font, radius } from './theme';
import { IconCheck, IconNav, s } from './ui';
import Chart from './Chart';

const Spec = ({ label, value, c }) => (
  <View style={{ width: '50%', paddingVertical: 9, paddingRight: 12 }}>
    <Text style={[s.specLabel, { color: c.faint }]}>{label}</Text>
    <Text style={[s.specValue, { color: c.ink }]}>{value}</Text>
  </View>
);

export default function DetailSheet({ row, city, cityKey, dur, c, onClose, onPick, picked }) {
  const { width } = useWindowDimensions();
  if (!row) return null;
  const { p, dist, cents, live } = row;
  const [lat, lon] = p.ll;
  const isPicked = picked === p.id;

  const navigate = () => {
    const native = Platform.select({
      ios: `maps://?daddr=${lat},${lon}&dirflg=d`,
      android: `google.navigation:q=${lat},${lon}`,
    });
    const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    Linking.canOpenURL(native)
      .then((ok) => Linking.openURL(ok ? native : web))
      .catch(() => Linking.openURL(web));
  };

  const specs = [
    ['Distance', distLabel(dist)],
    p.places ? ['Places', nf.format(p.places)] : null,
    p.haut ? ['Hauteur', `${p.haut.toFixed(2).replace('.', ',')} m`] : null,
    p.ouvrage ? ['Type', p.ouvrage] : null,
  ].filter(Boolean);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12,
          borderBottomWidth: 1, borderBottomColor: c.line,
        }}>
          <Text style={[s.sheetTitle, { color: c.ink, flex: 1 }]} numberOfLines={1}>{p.nom}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
            <Text style={[s.btnLabel, { color: c.blue }]}>Fermer</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 44, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Text style={[s.big, {
              color: cents === 0 ? c.free : cents == null ? c.faint : c.ink,
              fontSize: cents == null ? 22 : 38,
            }]}>
              {cents == null ? 'tarif non publié' : priceLabel(cents)}
            </Text>
            {cents != null && (
              <Text style={[s.body, { color: c.mute }]}>pour {DUR_LABEL[dur]}</Text>
            )}
          </View>

          {p.bad && p.bad.includes(dur) && (
            <View style={{ backgroundColor: c.warnSoft, padding: 11, borderRadius: radius.sm }}>
              <Text style={[s.small, { color: c.warn }]}>
                La grille de la source est incohérente sur cette durée. Affichée telle quelle,
                sans correction.
              </Text>
            </View>
          )}

          {live && (
            <View style={{ backgroundColor: c.freeSoft, padding: 14, borderRadius: radius.md }}>
              <Text style={{
                fontFamily: font.display, fontSize: 32, color: c.free, letterSpacing: -1,
              }}>
                {nf.format(live.libres)}
              </Text>
              <Text style={[s.small, { color: c.free }]}>
                {live.total ? `places libres sur ${nf.format(live.total)} · ` : 'places libres · '}
                relevé il y a {live.hours < 1
                  ? `${Math.round(live.hours * 60)} min`
                  : `${Math.round(live.hours)} h`}
              </Text>
            </View>
          )}

          <Pressable onPress={navigate} accessibilityRole="button"
                     style={({ pressed }) => ({
                       backgroundColor: pressed ? c.bluePress : c.blue,
                       padding: 15, borderRadius: radius.md, flexDirection: 'row',
                       alignItems: 'center', justifyContent: 'center', gap: 8,
                     })}>
            <IconNav color="#FFFFFF" />
            <Text style={[s.btnLabel, { color: '#FFFFFF', fontSize: 16 }]}>Y aller</Text>
          </Pressable>

          <Pressable onPress={() => onPick(isPicked ? null : p.id)} accessibilityRole="button"
                     style={{
                       padding: 14, borderRadius: radius.md, flexDirection: 'row',
                       alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1,
                       borderColor: isPicked ? c.free : c.line,
                       backgroundColor: isPicked ? c.freeSoft : c.paper,
                     }}>
            {isPicked && <IconCheck color={c.free} />}
            <Text style={[s.btnLabel, { color: isPicked ? c.free : c.ink }]}>
              {isPicked ? 'Parking choisi' : 'Choisir ce parking'}
            </Text>
          </Pressable>

          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: c.line,
            borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 2,
          }}>
            {specs.map(([l, v]) => <Spec key={l} label={l} value={v} c={c} />)}
          </View>

          {p.street1h != null && p.tar && p.tar['1h'] != null && (
            <View>
              <Text style={[s.h4, { color: c.mute }]}>Le parking ou la rue</Text>
              <Text style={[s.body, { color: c.ink2 }]}>
                Une heure ici coûte {priceLabel(p.tar['1h'])}. À l'horodateur juste à côté,{' '}
                {priceLabel(p.street1h)}.{' '}
                {p.tar['1h'] < p.street1h
                  ? 'Le parking est moins cher, et la voiture est à l’abri.'
                  : p.tar['1h'] > p.street1h
                  ? 'La rue est moins chère, si vous trouvez une place.'
                  : 'Même prix des deux côtés.'}
              </Text>
            </View>
          )}

          <View>
            <Text style={[s.h4, { color: c.mute }]}>
              Grille publiée par {city.source.court}
            </Text>
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 12 }}>
              {(p.grid && p.grid.length
                ? p.grid
                : DURATIONS.filter((d) => p.tar[d] != null).map((d) => [DUR_LABEL[d], p.tar[d]])
              ).map(([label, value], i, arr) => (
                <View key={label} style={{
                  flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
                  borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: c.line,
                }}>
                  <Text style={[s.body, { color: c.ink2 }]}>{label}</Text>
                  <Text style={[s.specValue, { color: c.ink, marginTop: 0 }]}>
                    {value === 0 ? 'gratuit' : priceLabel(value)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[s.small, { color: c.faint, marginTop: 6 }]}>
              Exactement les durées que la source publie. Rien n'est interpolé entre elles.
            </Text>
          </View>

          <View>
            <Text style={[s.h4, { color: c.mute }]}>Comparaison dans {city.ville}</Text>
            <Chart parking={p} cityKey={cityKey} dur={dur} c={c} width={width - 36} />
          </View>

          {p.adr ? (
            <View>
              <Text style={[s.h4, { color: c.mute }]}>Adresse</Text>
              <Text style={[s.body, { color: c.ink2 }]}>{p.adr}</Text>
            </View>
          ) : null}

          <Text style={[s.small, { color: c.faint, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }]}>
            {city.source.nom}, données du {frDate(city.source.maj)}, sous Licence Ouverte.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
