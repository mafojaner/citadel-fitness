import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { GradientButton } from './GradientButton';
import { useTheme } from '../theme/useTheme';

interface AvatarCropModalProps {
  /** Source image to crop. The modal is visible whenever this is non-null. */
  uri: string | null;
  onCancel: () => void;
  onCropped: (uri: string) => void;
}

const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

interface Size {
  width: number;
  height: number;
}
interface Offset {
  x: number;
  y: number;
}

/** Keeps the image covering the square viewport, so no empty gap can be cropped. */
function clampOffset(next: Offset, display: Size, viewport: number): Offset {
  return {
    x: Math.min(0, Math.max(viewport - display.width, next.x)),
    y: Math.min(0, Math.max(viewport - display.height, next.y)),
  };
}

/**
 * Square-crop UI for a profile picture, used where the OS doesn't provide
 * its own: expo-image-picker's `allowsEditing` is a no-op on web, so
 * without this a picked image would upload uncropped. Native keeps the
 * platform's own crop UI — see ProfileSettingsScreen.
 *
 * The viewport is square and masked to a circle to match how the avatar is
 * actually displayed, so what you frame is what you get. The parent keys
 * this component on the uri, so each new image mounts it fresh rather than
 * needing an effect to reset zoom/offset.
 */
export function AvatarCropModal({ uri, onCancel, onCropped }: AvatarCropModalProps) {
  const { colors, spacing, typography } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const viewport = Math.min(300, windowWidth - 80);

  const [source, setSource] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scale that makes the image exactly cover the square viewport at zoom 1.
  const baseScale = source ? viewport / Math.min(source.width, source.height) : 1;
  const scale = baseScale * zoom;
  const displayWidth = source ? source.width * scale : 0;
  const displayHeight = source ? source.height * scale : 0;

  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (width, height) => {
        setSource({ width, height });
        // Start centred rather than pinned to the top-left corner, so the
        // middle of the photo — usually the subject — is framed by default.
        const initialScale = viewport / Math.min(width, height);
        setOffset({
          x: (viewport - width * initialScale) / 2,
          y: (viewport - height * initialScale) / 2,
        });
      },
      () => setError('Could not read that image.')
    );
    // Deliberately keyed on uri alone. `viewport` is read only to centre the
    // image on first load; including it would re-run on every window resize
    // and throw away whatever the user had framed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // Rebuilt when the geometry changes so the gesture closes over current
  // values directly — no refs and no mutation, both of which this project's
  // React Compiler lint rules reject. Geometry only changes on zoom or image
  // load, never mid-drag, so an in-progress gesture is never interrupted.
  const panResponder = useMemo(() => {
    // gesture.dx/dy are cumulative from touch start, so track the previous
    // value in plain closure scope and apply only the increment. That keeps
    // the state update purely functional.
    let previous: Offset = { x: 0, y: 0 };
    const reset = () => {
      previous = { x: 0, y: 0 };
    };
    return PanResponder.create({
      // Only claim the responder once the finger actually moves. Claiming on
      // touch start swallows taps meant for the surrounding controls, and
      // without the release/terminate handlers below the responder is never
      // given back — which leaves the whole modal unresponsive after one press.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: reset,
      onPanResponderTerminate: reset,
      onPanResponderGrant: reset,
      onPanResponderMove: (_evt, gesture) => {
        const dx = gesture.dx - previous.x;
        const dy = gesture.dy - previous.y;
        // `previous` is gesture-local bookkeeping: reset on every touch
        // start, read only inside this handler, and never referenced during
        // render — so it can't cause the inconsistent-render problem the
        // rule guards against. Holding it in state instead would re-render
        // on every pointer move purely to store a value render never reads.
        // eslint-disable-next-line react-hooks/immutability
        previous = { x: gesture.dx, y: gesture.dy };
        if (displayWidth === 0) return;
        setOffset((current) =>
          clampOffset(
            { x: current.x + dx, y: current.y + dy },
            { width: displayWidth, height: displayHeight },
            viewport
          )
        );
      },
    });
  }, [displayWidth, displayHeight, viewport]);

  const changeZoom = (delta: number) => {
    if (!source) return;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(1, zoom + delta));
    const nextScale = baseScale * nextZoom;
    const nextDisplay: Size = {
      width: source.width * nextScale,
      height: source.height * nextScale,
    };
    setZoom(nextZoom);
    setOffset((current) => {
      // Zoom about the middle of the crop window rather than the image's
      // top-left corner, so whatever is framed stays framed. Find the source
      // point currently under the centre, then re-position it there at the
      // new scale. Re-clamped so zooming out can't leave a gap in the window.
      const centreX = (viewport / 2 - current.x) / scale;
      const centreY = (viewport / 2 - current.y) / scale;
      return clampOffset(
        { x: viewport / 2 - centreX * nextScale, y: viewport / 2 - centreY * nextScale },
        nextDisplay,
        viewport
      );
    });
  };

  const onConfirm = async () => {
    if (!uri || !source) return;
    setWorking(true);
    setError(null);
    try {
      // Map the viewport window back onto source pixels: `offset` is the
      // image's top-left relative to the viewport, so negating it gives the
      // crop origin, and the window spans viewport/scale source pixels.
      // Both are clamped so rounding can never exceed the image bounds.
      const size = Math.round(Math.min(viewport / scale, source.width, source.height));
      const originX = Math.round(Math.min(Math.max(-offset.x / scale, 0), source.width - size));
      const originY = Math.round(Math.min(Math.max(-offset.y / scale, 0), source.height - size));

      const context = ImageManipulator.manipulate(uri);
      const rendered = await context
        .crop({ originX, originY, width: size, height: size })
        .renderAsync();
      const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      onCropped(result.uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not crop that image.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal visible={uri != null} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.75)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: spacing.lg,
            gap: spacing.md,
            alignItems: 'center',
            width: '100%',
            maxWidth: 380,
          }}
        >
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>Crop your photo</Text>

          <View
            style={{
              width: viewport,
              height: viewport,
              borderRadius: viewport / 2,
              overflow: 'hidden',
              backgroundColor: colors.background,
            }}
            {...panResponder.panHandlers}
          >
            {source && uri ? (
              <Image
                source={{ uri }}
                style={{
                  position: 'absolute',
                  left: offset.x,
                  top: offset.y,
                  width: displayWidth,
                  height: displayHeight,
                }}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
          </View>

          <Text style={[typography.caption, { color: colors.textMuted }]}>Drag to reposition</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <Pressable
              onPress={() => changeZoom(-ZOOM_STEP)}
              disabled={zoom <= 1}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              hitSlop={8}
            >
              <Ionicons
                name="remove-circle-outline"
                size={30}
                color={zoom <= 1 ? colors.textMuted : colors.primary}
              />
            </Pressable>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, minWidth: 48, textAlign: 'center' },
              ]}
            >
              {zoom.toFixed(2)}x
            </Text>
            <Pressable
              onPress={() => changeZoom(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              hitSlop={8}
            >
              <Ionicons
                name="add-circle-outline"
                size={30}
                color={zoom >= MAX_ZOOM ? colors.textMuted : colors.primary}
              />
            </Pressable>
          </View>

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%' }}>
            <View style={{ flex: 1 }}>
              <GradientButton label="Cancel" variant="outline" onPress={onCancel} disabled={working} />
            </View>
            <View style={{ flex: 1 }}>
              <GradientButton
                label={working ? 'Cropping...' : 'Use photo'}
                loading={working}
                disabled={!source || working}
                onPress={onConfirm}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
