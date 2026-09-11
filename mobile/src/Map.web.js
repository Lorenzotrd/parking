// Sur le web, react-native-maps n'existe pas. Ce substitut sert uniquement à
// prévisualiser la mise en page et la typographie dans un navigateur ; il n'est
// jamais inclus dans le paquet mobile, Metro choisissant Map.js sur iOS et
// Android.
import React from 'react';
import { Text, View } from 'react-native';

const MapView = React.forwardRef(({ style, children }, ref) => {
  React.useImperativeHandle(ref, () => ({ animateToRegion: () => {} }));
  return (
    <View style={[style, { backgroundColor: '#DDE7F0', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#61748C', fontSize: 12 }}>
        carte système, indisponible en prévisualisation web
      </Text>
      <View style={{ position: 'absolute', inset: 0 }}>{children}</View>
    </View>
  );
});

export const Marker = ({ children }) => (
  <View style={{ position: 'absolute' }}>{children}</View>
);

export default MapView;
