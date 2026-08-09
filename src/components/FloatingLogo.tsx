import { useEffect, useState } from 'react';
import { Animated, Easing, Image, View, type StyleProp, type ViewStyle } from 'react-native';

interface FloatingLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The castle crest drifting gently in place — mirrors the landing page's
 * `.mock-float` motion (translateY + a few degrees of rotation, 7s
 * ease-in-out, back and forth) so the app's auth screens read as the same
 * brand as citadelfitness.app instead of a bare form with no identity.
 */
export function FloatingLogo({ size = 96, style }: FloatingLogoProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '0.6deg'] });

  return (
    <Animated.View style={[{ transform: [{ translateY }, { rotate }] }, style]}>
      {/* Shadow and circular clipping need separate layers — a View can't
          apply overflow: hidden (required to actually clip the square
          image to a circle on web) and cast its own box-shadow at the
          same time, since the clip would cut the shadow off too. */}
      <View
        style={{
          borderRadius: size / 2,
          shadowColor: '#0B0E14',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
          {/* icon.png is the emblem pre-composited on the ink900 background
              (opaque, no alpha) — used here instead of the transparent
              white-glyph adaptive-icon foreground, which would vanish on
              this screen's light background. */}
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        </View>
      </View>
    </Animated.View>
  );
}
