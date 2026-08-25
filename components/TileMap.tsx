import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { Plus, Minus, Crosshair } from 'lucide-react-native';

/**
 * A minimal slippy map built from OpenStreetMap raster tiles.
 *
 * react-native-maps has no web implementation and the Google Maps JS API needs
 * a billed API key, so neither works for a key-less web-first build. Raster
 * tiles are just images, which means one implementation renders identically on
 * web, iOS and Android.
 *
 * Note on tile usage: OpenStreetMap's public tile servers are fine for low
 * traffic but ask that heavy users self-host or use a commercial provider.
 * Swap TILE_URL for a provider (MapTiler, Stadia, Mapbox) before any real
 * volume.
 */

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

const TILE_URL = (x: number, y: number, z: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  selected?: boolean;
};

// --- Web Mercator projection, in "world pixels" at the given zoom ------------

const lonToWorldX = (lon: number, zoom: number) =>
  ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);

const latToWorldY = (lat: number, zoom: number) => {
  const clamped = Math.max(Math.min(lat, 85.05112878), -85.05112878);
  const radians = (clamped * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
    TILE_SIZE *
    Math.pow(2, zoom)
  );
};

const worldXToLon = (x: number, zoom: number) =>
  (x / (TILE_SIZE * Math.pow(2, zoom))) * 360 - 180;

const worldYToLat = (y: number, zoom: number) => {
  const n = Math.PI - (2 * Math.PI * y) / (TILE_SIZE * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export default function TileMap({
  markers,
  initialCenter,
  initialZoom = 12,
  onMarkerPress,
}: {
  markers: MapMarker[];
  initialCenter: { latitude: number; longitude: number };
  initialZoom?: number;
  onMarkerPress?: (marker: MapMarker) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(initialZoom);
  const [center, setCenter] = useState(initialCenter);

  // Held in a ref so the pan gesture reads the latest values without
  // re-creating the responder on every frame.
  const gestureState = useRef({ center: initialCenter, zoom: initialZoom });
  gestureState.current = { center, zoom };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onPanResponderMove: (_, gesture) => {
          const { center: startCenter, zoom: currentZoom } = gestureState.current;
          const worldX = lonToWorldX(startCenter.longitude, currentZoom) - gesture.dx;
          const worldY = latToWorldY(startCenter.latitude, currentZoom) - gesture.dy;
          setCenter({
            longitude: worldXToLon(worldX, currentZoom),
            latitude: worldYToLat(worldY, currentZoom),
          });
        },
        onPanResponderRelease: () => {
          gestureState.current.center = gestureState.current.center;
        },
      }),
    []
  );

  // Reset the drag origin whenever a gesture finishes, so the next drag is
  // relative to where the map actually ended up.
  const onTouchEnd = () => {
    gestureState.current.center = center;
  };

  const { tiles, pins } = useMemo(() => {
    if (!size.width || !size.height) return { tiles: [], pins: [] };

    const centerWorldX = lonToWorldX(center.longitude, zoom);
    const centerWorldY = latToWorldY(center.latitude, zoom);

    // Top-left corner of the viewport, in world pixels.
    const originX = centerWorldX - size.width / 2;
    const originY = centerWorldY - size.height / 2;

    const firstTileX = Math.floor(originX / TILE_SIZE);
    const firstTileY = Math.floor(originY / TILE_SIZE);
    const tilesAcross = Math.ceil(size.width / TILE_SIZE) + 1;
    const tilesDown = Math.ceil(size.height / TILE_SIZE) + 1;
    const maxTile = Math.pow(2, zoom);

    const nextTiles: { key: string; uri: string; left: number; top: number }[] = [];
    for (let dx = 0; dx < tilesAcross; dx += 1) {
      for (let dy = 0; dy < tilesDown; dy += 1) {
        const tileX = firstTileX + dx;
        const tileY = firstTileY + dy;
        if (tileY < 0 || tileY >= maxTile) continue;

        // Wrap horizontally so panning past the date line keeps working.
        const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;

        nextTiles.push({
          key: `${zoom}/${tileX}/${tileY}`,
          uri: TILE_URL(wrappedX, tileY, zoom),
          left: tileX * TILE_SIZE - originX,
          top: tileY * TILE_SIZE - originY,
        });
      }
    }

    const nextPins = markers
      .map((marker) => ({
        marker,
        left: lonToWorldX(marker.longitude, zoom) - originX,
        top: latToWorldY(marker.latitude, zoom) - originY,
      }))
      // Only render pins that are actually on screen (with a margin for the label).
      .filter(
        (pin) =>
          pin.left > -140 &&
          pin.left < size.width + 140 &&
          pin.top > -60 &&
          pin.top < size.height + 60
      );

    return { tiles: nextTiles, pins: nextPins };
  }, [center, zoom, size, markers]);

  const recenter = () => {
    setCenter(initialCenter);
    setZoom(initialZoom);
    gestureState.current = { center: initialCenter, zoom: initialZoom };
  };

  const onLayout = (nativeEvent: LayoutChangeEvent) => {
    const { width, height } = nativeEvent.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View
        style={StyleSheet.absoluteFill}
        {...panResponder.panHandlers}
        onTouchEnd={onTouchEnd}
      >
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ))}

        {pins.map(({ marker, left, top }) => (
          <Pressable
            key={marker.id}
            onPress={() => onMarkerPress?.(marker)}
            style={[styles.pinWrap, { left: left - 70, top: top - 44 }]}
          >
            <View style={[styles.pinBubble, marker.selected && styles.pinBubbleSelected]}>
              <Text
                style={[styles.pinText, marker.selected && styles.pinTextSelected]}
                numberOfLines={1}
              >
                {marker.label}
              </Text>
            </View>
            <View style={[styles.pinPoint, marker.selected && styles.pinPointSelected]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => setZoom((z) => Math.min(z + 1, MAX_ZOOM))}
          style={styles.controlBtn}
        >
          <Plus size={18} color="#111827" />
        </Pressable>
        <Pressable
          onPress={() => setZoom((z) => Math.max(z - 1, MIN_ZOOM))}
          style={styles.controlBtn}
        >
          <Minus size={18} color="#111827" />
        </Pressable>
        <Pressable onPress={recenter} style={styles.controlBtn}>
          <Crosshair size={18} color="#111827" />
        </Pressable>
      </View>

      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#e8e6e1' },
  tile: { position: 'absolute', width: TILE_SIZE, height: TILE_SIZE },

  pinWrap: { position: 'absolute', width: 140, alignItems: 'center' },
  pinBubble: {
    maxWidth: 140,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pinBubbleSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  pinText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  pinTextSelected: { color: '#fff' },
  pinPoint: {
    width: 10,
    height: 10,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d1d5db',
    transform: [{ rotate: '45deg' }],
    marginTop: -5,
  },
  pinPointSelected: { backgroundColor: '#111827', borderColor: '#111827' },

  controls: { position: 'absolute', right: 12, bottom: 110, gap: 8 },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  attribution: {
    position: 'absolute',
    left: 6,
    bottom: 4,
    fontSize: 9,
    color: '#4b5563',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
});
