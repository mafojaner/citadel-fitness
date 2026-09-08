import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

export const LOG_WIDGET_SIZE = 56;

const OPTION_SIZE = 48;
const OPTION_GAP = 14;
const OPEN_MS = 240;
const CLOSE_MS = 180;

interface LogShortcutWidgetProps {
  /** Distance from the bottom of the screen to the widget's own bottom edge. */
  bottom: number;
  /** Distance from the right of the screen to the widget's right edge. */
  right: number;
  onAddWorkout: () => void;
  onLogWater: () => void;
}

interface Option {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Undefined closes without going anywhere, which is what Cancel is. */
  run?: () => void;
}

/**
 * The logging shortcut: a plus in the bottom-right corner that opens the
 * two things worth logging without first navigating to the screen that
 * owns them.
 *
 * Its colour is `ctaFill`, the mirrored pair the primary button already
 * uses -- near-black on the light theme, white on the dark one. That is
 * "black in light mode" without introducing a second near-black that would
 * then have to be kept in step with the first, and it means the widget is
 * the same object as the app's other primary action rather than a new one.
 *
 * The open state is a Modal rather than an absolute layer, for the reason
 * the workout takeover records: as a plain overlay it would sit inside the
 * navigator's content area, leaving the header lit above it and the tab bar
 * below it, so a blur that is supposed to cover the app would visibly stop
 * short of both ends.
 *
 * Options fan vertically rather than on an arc. An arc is the nicer shape
 * for bare icons and the wrong one the moment they carry text: labels
 * radiating from a corner overlap each other and run off the right edge.
 * Stacked, the discs share the widget's centre line and the labels hang to
 * their left, which is legible and still reads as opening out of the
 * widget.
 */
export function LogShortcutWidget({ bottom, right, onAddWorkout, onLogWater }: LogShortcutWidgetProps) {
  const { colors, radius, typography, scheme } = useTheme();
  const [open, setOpen] = useState(false);
  // Kept mounted through the closing animation, so the options fade out
  // rather than vanishing the instant one is chosen.
  const [visible, setVisible] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  // Mounting is done by whoever opens it, not here: setting state
  // synchronously inside an effect is a cascading render, and the Modal has
  // to exist before the animation starts anyway. The effect only drives the
  // animation, and only unmounts on the way out -- which happens in the
  // completion callback, where state is allowed.
  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, progress]);

  const close = useCallback(() => setOpen(false), []);
  const openMenu = useCallback(() => {
    setVisible(true);
    setOpen(true);
  }, []);

  const options: Option[] = [
    { key: 'workout', label: 'Add workout', icon: 'barbell', run: onAddWorkout },
    { key: 'water', label: 'Log water', icon: 'water', run: onLogWater },
    { key: 'cancel', label: 'Cancel', icon: 'close' },
  ];

  const choose = (option: Option) => {
    setOpen(false);
    // After the close, not with it: navigating mid-animation unmounts the
    // Modal under its own exit and the blur snaps away rather than lifting.
    if (option.run) setTimeout(option.run, CLOSE_MS);
  };

  // A plus that becomes a cross. The same glyph rotated is one object
  // changing state; swapping to a different icon would be two.
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const widgetFace = (
    <View
      style={{
        width: LOG_WIDGET_SIZE,
        height: LOG_WIDGET_SIZE,
        borderRadius: LOG_WIDGET_SIZE / 2,
        backgroundColor: colors.ctaFill,
        alignItems: 'center',
        justifyContent: 'center',
        // Matches the primary button's split: a shadow under a white
        // control on a near-black page is invisible work.
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0 : 0.24,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: scheme === 'dark' ? 0 : 6,
      }}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="add" size={30} color={colors.ctaText} />
      </Animated.View>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="Log something"
        accessibilityHint="Opens shortcuts for adding a workout or logging water"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          position: 'absolute',
          right,
          bottom,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        {widgetFace}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={close}
      >
        {/* The whole backdrop dismisses. With three options one of which is
            Cancel, a member who wants out has two obvious ways and the
            usual third -- tapping away from the thing. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close logging options"
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
            <BlurView
              intensity={28}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            {/* Under the blur on platforms where it resolves to very little
                -- the point is that the app behind stops competing for
                attention, and a blur alone does not always achieve that. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: scheme === 'dark' ? 'rgba(11,14,20,0.4)' : 'rgba(11,14,20,0.18)' },
              ]}
            />
          </Animated.View>
        </Pressable>

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {options.map((option, index) => {
            // Stacked upward from the widget, nearest first. Each starts a
            // little later than the one below it, so the group opens as a
            // sequence rather than arriving as a block.
            const offset = bottom + LOG_WIDGET_SIZE + OPTION_GAP + index * (OPTION_SIZE + OPTION_GAP);
            const start = index * 0.12;
            const range = [start, Math.min(start + 0.6, 1)];
            const opacity = progress.interpolate({
              inputRange: range,
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            const translateY = progress.interpolate({
              inputRange: range,
              outputRange: [OPTION_SIZE * 0.6, 0],
              extrapolate: 'clamp',
            });
            const scale = progress.interpolate({
              inputRange: range,
              outputRange: [0.8, 1],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={option.key}
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  right,
                  bottom: offset,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  opacity,
                  transform: [{ translateY }, { scale }],
                }}
              >
                <Pressable
                  onPress={() => choose(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radius.pill,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                      {option.label}
                    </Text>
                  </View>
                  {/* Centred on the widget's own centre line, which is what
                      makes the column read as coming out of it. */}
                  <View
                    style={{
                      width: OPTION_SIZE,
                      height: OPTION_SIZE,
                      borderRadius: OPTION_SIZE / 2,
                      marginRight: (LOG_WIDGET_SIZE - OPTION_SIZE) / 2,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={option.icon} size={22} color={colors.textPrimary} />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}

          {/* The widget itself, redrawn at the same coordinates so it does
              not appear to move when the menu opens. The real one is behind
              the blur; this is the one that rotates. */}
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close logging options"
            style={{ position: 'absolute', right, bottom }}
          >
            {widgetFace}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
