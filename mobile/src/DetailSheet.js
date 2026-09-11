// Fiche d'un parking. Le prix, les places libres, comment y aller. Rien de plus.
import React from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { distLabel, frDate, money, nf, priceLabel, DUR_LABEL } from './lib';
import { radius } from './theme';
import { Tag } from './ui';

const Spec = ({ label, value, c }) => (
  <View style={{ flex: 1, minWidth: 90 }}>
    <Text style={{ fontSize: 10.5, color: c.faint, letterSpacing: 0.6, textTransform: 'uppercase' }}>
      {label}
    </Text>
    <Text style={{ fontSize: 14.5, color: c.ink, fontWeight: '600', marginTop: 2 }}>{value}</Text>
  </View>
);

export default function DetailSheet({ row, city, dur, c, onClose, onPick, picked }) {
  if (!row) return null;
  const { p, dist, cents, live } = row;
  const [lat, lon] = p.ll;

  const navigate = () => {
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lon}&dirflg=d`,
      android: `google.navigation:q=${lat},${lon}`,
    });
    const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    Linking.canOpenURL(url).then((ok) => Linking.openURL(ok ? url : web)).catch(() => Linking.openURL(web));
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
          flexDirection: 'row', alignItems: 'center', padding: 16,
          borderBottomWidth: 1, borderBottomColor: c.line, gap: 12,
        }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: c.ink, letterSpacing: -0.4 }}
                numberOfLines={1}>
            {p.nom}
          </Text>
          <Pressable onPress={onClose} accessibilityLabel="Fermer" hitSlop={10}>
            <Text style={{ fontSize: 15, color: c.blue, fontWeight: '600' }}>Fermer</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <Text style={{
              fontSize: 40, fontWeight: '800', letterSpacing: -1.4,
              color: cents === 0 ? c.free : cents == null ? c.faint : c.ink,
            }}>
              {cents == null ? 'tarif non publié' : priceLabel(cents)}
            </Text>
            {cents != null && (
              <Text style={{ fontSize: 14, color: c.mute }}>pour {DUR_LABEL[dur]}</Text>
            )}
          </View>

          {p.bad && p.bad.includes(dur) && (
            <View style={{ backgroundColor: c.warnSoft, padding: 11, borderRadius: radius.sm }}>
              <Text style={{ color: c.warn, fontSize: 12.5, lineHeight: 18 }}>
                La grille de la source est incohérente sur cette durée. Affichée telle quelle.
              </Text>
            </View>
          )}

          {live && (
            <View style={{ backgroundColor: c.freeSoft, padding: 13, borderRadius: radius.md }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: c.free, letterSpacing: -1 }}>
                {nf.format(live.libres)}
                <Text style={{ fontSize: 14, fontWeight: '600' }}>
                  {live.total ? ` places libres sur ${nf.format(live.total)}` : ' places libres'}
                </Text>
              </Text>
              <Text style={{ fontSize: 11.5, color: c.free, marginTop: 2, opacity: 0.85 }}>
                relevé il y a {live.hours < 1 ? `${Math.round(live.hours * 60)} min` : `${Math.round(live.hours)} h`}
              </Text>
            </View>
          )}

          <Pressable
            onPress={navigate}
            accessibilityRole="button"
            style={{
              backgroundColor: c.blue, padding: 16, borderRadius: radius.md, alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Y aller</Text>
          </Pressable>

          <Pressable
            onPress={() => onPick(picked === p.id ? null : p.id)}
            accessibilityRole="button"
            style={{
              padding: 14, borderRadius: radius.md, alignItems: 'center', borderWidth: 1,
              borderColor: picked === p.id ? c.free : c.line,
              backgroundColor: picked === p.id ? c.freeSoft : c.paper,
            }}
          >
            <Text style={{
              fontSize: 15, fontWeight: '600',
              color: picked === p.id ? c.free : c.ink,
            }}>
              {picked === p.id ? 'Parking choisi' : 'Choisir ce parking'}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
            {specs.map(([l, v]) => <Spec key={l} label={l} value={v} c={c} />)}
          </View>

          {p.street1h != null && p.tar && p.tar['1h'] != null && (
            <View>
              <Text style={{ fontSize: 12.5, color: c.ink2, lineHeight: 19 }}>
                Une heure ici : {priceLabel(p.tar['1h'])}. À l'horodateur juste à côté :{' '}
                {priceLabel(p.street1h)}.{' '}
                {p.tar['1h'] < p.street1h
                  ? 'Le parking est moins cher.'
                  : p.tar['1h'] > p.street1h
                  ? 'La rue est moins chère, si vous trouvez une place.'
                  : 'Même prix.'}
              </Text>
            </View>
          )}

          {p.adr ? (
            <Text style={{ fontSize: 12.5, color: c.mute, lineHeight: 18 }}>{p.adr}</Text>
          ) : null}

          <Text style={{ fontSize: 11, color: c.faint, lineHeight: 16 }}>
            {city.source.nom}, données du {frDate(city.source.maj)}, Licence Ouverte.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
