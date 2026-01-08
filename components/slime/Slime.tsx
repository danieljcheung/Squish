import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';

// Slime color type
export type SlimeColor = 'mint' | 'peach' | 'lavender' | 'skyBlue' | 'coral' | 'lemon' | 'rose' | 'sage';

// Slime type (determines shape AND accessories)
// 'finance' is an alias for 'budget_helper'
export type SlimeType = 'base' | 'fitness_coach' | 'budget_helper' | 'finance' | 'study_buddy';

// Size presets
export type SlimeSize = 'xs' | 'small' | 'medium' | 'large';

interface SlimeProps {
  color?: SlimeColor;
  type?: SlimeType;
  size?: SlimeSize;
  animated?: boolean;
  hideAccessories?: boolean;
}

// Size configurations (width x height)
const SIZE_CONFIG = {
  xs: { width: 48, height: 38 },
  small: { width: 80, height: 64 },
  medium: { width: 120, height: 96 },
  large: { width: 160, height: 128 },
};

// Get hex color from slime color name
const getSlimeColor = (colorName: SlimeColor): string => {
  return colors.slime[colorName] || colors.slime.mint;
};

// Border radius configurations for each type
// Format: [topLeft, topRight, bottomRight, bottomLeft]
// Each corner has [horizontal%, vertical%] but RN only supports single value
// So we approximate with percentage of smaller dimension
const SHAPE_CONFIG = {
  base: {
    // border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%
    borderTopLeftRadius: '40%',
    borderTopRightRadius: '60%',
    borderBottomRightRadius: '70%',
    borderBottomLeftRadius: '30%',
  },
  fitness_coach: {
    // Same shape as base (no special shape for fitness coach)
    borderTopLeftRadius: '40%',
    borderTopRightRadius: '60%',
    borderBottomRightRadius: '70%',
    borderBottomLeftRadius: '30%',
  },
  budget_helper: {
    // border-radius: 30% 70% 70% 30% / 30% 30% 70% 70% (tilted left, rounder)
    borderTopLeftRadius: '30%',
    borderTopRightRadius: '70%',
    borderBottomRightRadius: '70%',
    borderBottomLeftRadius: '30%',
  },
  finance: {
    // Same as budget_helper
    borderTopLeftRadius: '30%',
    borderTopRightRadius: '70%',
    borderBottomRightRadius: '70%',
    borderBottomLeftRadius: '30%',
  },
  study_buddy: {
    // border-radius: 60% 40% 30% 70% / 60% 30% 70% 40% (taller/stretched)
    borderTopLeftRadius: '60%',
    borderTopRightRadius: '40%',
    borderBottomRightRadius: '30%',
    borderBottomLeftRadius: '70%',
  },
};

// Morph targets for idle animation (slight variations)
const MORPH_VARIANTS = {
  base: [
    { tl: 40, tr: 60, br: 70, bl: 30 },
    { tl: 45, tr: 55, br: 65, bl: 35 },
    { tl: 38, tr: 62, br: 72, bl: 28 },
  ],
  fitness_coach: [
    // Same as base (fitness coach looks identical to base)
    { tl: 40, tr: 60, br: 70, bl: 30 },
    { tl: 45, tr: 55, br: 65, bl: 35 },
    { tl: 38, tr: 62, br: 72, bl: 28 },
  ],
  budget_helper: [
    { tl: 30, tr: 70, br: 70, bl: 30 },
    { tl: 35, tr: 65, br: 65, bl: 35 },
    { tl: 28, tr: 72, br: 72, bl: 28 },
  ],
  finance: [
    // Same as budget_helper
    { tl: 30, tr: 70, br: 70, bl: 30 },
    { tl: 35, tr: 65, br: 65, bl: 35 },
    { tl: 28, tr: 72, br: 72, bl: 28 },
  ],
  study_buddy: [
    { tl: 60, tr: 40, br: 30, bl: 70 },
    { tl: 55, tr: 45, br: 35, bl: 65 },
    { tl: 62, tr: 38, br: 28, bl: 72 },
  ],
};

// Eye configuration by type and size
const getEyeConfig = (type: SlimeType, size: SlimeSize) => {
  const sizeMultiplier = { xs: 0.3, small: 0.5, medium: 0.75, large: 1 }[size] || 0.75;

  const baseConfig: Record<string, { eyeSize: number; eyeGap: number; eyeTop: string; hasGlasses: boolean; glassesType?: string }> = {
    base: { eyeSize: 12, eyeGap: 24, eyeTop: '38%', hasGlasses: false },
    fitness_coach: { eyeSize: 12, eyeGap: 24, eyeTop: '38%', hasGlasses: false }, // Same as base
    budget_helper: { eyeSize: 0, eyeGap: 0, eyeTop: '35%', hasGlasses: true, glassesType: 'round' },
    finance: { eyeSize: 0, eyeGap: 0, eyeTop: '35%', hasGlasses: true, glassesType: 'round' }, // Same as budget_helper
    study_buddy: { eyeSize: 10, eyeGap: 20, eyeTop: '35%', hasGlasses: true, glassesType: 'square' },
  };

  // Fallback to base config for unknown types
  const config = baseConfig[type] || baseConfig.base;
  return {
    ...config,
    eyeSize: Math.round(config.eyeSize * sizeMultiplier),
    eyeGap: Math.round(config.eyeGap * sizeMultiplier),
  };
};

// ============================================
// FACE COMPONENTS
// ============================================

// Eyes (static)
const Eyes = ({
  eyeSize,
  eyeGap,
  marginBottom = 4,
}: {
  eyeSize: number;
  eyeGap: number;
  marginBottom?: number;
}) => {
  if (eyeSize === 0) return null;

  return (
    <View style={[styles.eyesContainer, { gap: eyeGap, marginBottom }]}>
      <View
        style={[
          styles.eye,
          { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }
        ]}
      />
      <View
        style={[
          styles.eye,
          { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }
        ]}
      />
    </View>
  );
};

// Curved smile mouth
const Mouth = ({ size }: { size: SlimeSize }) => {
  const sizeMultiplier = { xs: 0.3, small: 0.5, medium: 0.75, large: 1 }[size];
  // Ensure minimum dimensions for the curve to be visible
  const mouthWidth = Math.max(6, Math.round(16 * sizeMultiplier));
  const mouthHeight = Math.max(4, Math.round(6 * sizeMultiplier));
  const borderWidth = Math.max(1, Math.round(2 * sizeMultiplier));
  const marginTop = Math.max(1, Math.round(2 * sizeMultiplier));

  return (
    <View style={[styles.mouthContainer, { marginTop }]}>
      <View
        style={[
          styles.mouth,
          {
            width: mouthWidth,
            height: mouthHeight,
            borderBottomLeftRadius: mouthWidth,
            borderBottomRightRadius: mouthWidth,
            borderWidth: borderWidth,
            borderTopWidth: 0,
          }
        ]}
      />
    </View>
  );
};

// ============================================
// ACCESSORIES
// ============================================

// Headband for fitness coach
const Headband = ({ width }: { width: number }) => {
  const bandHeight = Math.round(width * 0.12);
  const bandWidth = Math.round(width * 0.9);

  return (
    <View style={[styles.headband, { width: bandWidth, height: bandHeight }]}>
      <View style={styles.headbandStripe} />
    </View>
  );
};

// Round glasses for budget helper (these ARE the eyes)
const RoundGlasses = ({ size }: { size: SlimeSize }) => {
  const sizeMultiplier = { xs: 0.3, small: 0.5, medium: 0.75, large: 1 }[size];
  const glassSize = Math.round(32 * sizeMultiplier);
  const bridgeWidth = Math.round(12 * sizeMultiplier);
  const bridgeHeight = Math.round(6 * sizeMultiplier);
  const borderWidth = Math.max(1, Math.round(3 * sizeMultiplier));
  const bridgeMargin = Math.max(1, Math.round(2 * sizeMultiplier));

  return (
    <View style={styles.glassesContainer}>
      {/* Left lens */}
      <View style={[styles.roundLens, { width: glassSize, height: glassSize, borderRadius: glassSize / 2, borderWidth }]}>
        <View style={[styles.glassPupil, { width: glassSize * 0.35, height: glassSize * 0.35, borderRadius: glassSize * 0.175 }]} />
      </View>
      {/* Bridge */}
      <View style={[styles.glassBridge, { width: bridgeWidth, height: bridgeHeight, borderRadius: bridgeHeight / 2, marginHorizontal: bridgeMargin }]} />
      {/* Right lens */}
      <View style={[styles.roundLens, { width: glassSize, height: glassSize, borderRadius: glassSize / 2, borderWidth }]}>
        <View style={[styles.glassPupil, { width: glassSize * 0.35, height: glassSize * 0.35, borderRadius: glassSize * 0.175 }]} />
      </View>
    </View>
  );
};

// Square glasses for study buddy
const SquareGlasses = ({ size }: { size: SlimeSize }) => {
  const sizeMultiplier = { xs: 0.3, small: 0.5, medium: 0.75, large: 1 }[size];
  const glassWidth = Math.round(28 * sizeMultiplier);
  const glassHeight = Math.round(22 * sizeMultiplier);
  const bridgeWidth = Math.round(10 * sizeMultiplier);
  const bridgeHeight = Math.round(4 * sizeMultiplier);

  return (
    <View style={styles.glassesContainer}>
      {/* Left lens */}
      <View style={[styles.squareLens, { width: glassWidth, height: glassHeight, borderRadius: 4 }]} />
      {/* Bridge */}
      <View style={[styles.glassBridge, { width: bridgeWidth, height: bridgeHeight, borderRadius: bridgeHeight / 2 }]} />
      {/* Right lens */}
      <View style={[styles.squareLens, { width: glassWidth, height: glassHeight, borderRadius: 4 }]} />
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function Slime({
  color = 'mint',
  type = 'base',
  size = 'medium',
  animated = true,
  hideAccessories = false,
}: SlimeProps) {
  const { width, height } = SIZE_CONFIG[size] || SIZE_CONFIG.medium;
  const hexColor = getSlimeColor(color);
  const eyeConfig = getEyeConfig(type, size);
  const morphVariants = MORPH_VARIANTS[type] || MORPH_VARIANTS.base;

  // Animation values
  const morphProgress = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;

    // Organic morph animation - slowly shift between border radius variants
    morphProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

  }, [animated]);

  // Animated blob shape
  const blobStyle = useAnimatedStyle(() => {
    const v0 = morphVariants[0];
    const v1 = morphVariants[1];
    const v2 = morphVariants[2];

    // Interpolate between variants
    const progress = morphProgress.value;

    let tl, tr, br, bl;
    if (progress <= 1) {
      tl = interpolate(progress, [0, 1], [v0.tl, v1.tl]);
      tr = interpolate(progress, [0, 1], [v0.tr, v1.tr]);
      br = interpolate(progress, [0, 1], [v0.br, v1.br]);
      bl = interpolate(progress, [0, 1], [v0.bl, v1.bl]);
    } else {
      tl = interpolate(progress, [1, 2], [v1.tl, v2.tl]);
      tr = interpolate(progress, [1, 2], [v1.tr, v2.tr]);
      br = interpolate(progress, [1, 2], [v1.br, v2.br]);
      bl = interpolate(progress, [1, 2], [v1.bl, v2.bl]);
    }

    // Convert percentages to actual pixel values based on size
    const minDim = Math.min(width, height);
    return {
      borderTopLeftRadius: (tl / 100) * minDim,
      borderTopRightRadius: (tr / 100) * minDim,
      borderBottomRightRadius: (br / 100) * minDim,
      borderBottomLeftRadius: (bl / 100) * minDim,
    };
  });

  // Static style for non-animated
  const staticBlobStyle = {
    borderTopLeftRadius: (morphVariants[0].tl / 100) * Math.min(width, height),
    borderTopRightRadius: (morphVariants[0].tr / 100) * Math.min(width, height),
    borderBottomRightRadius: (morphVariants[0].br / 100) * Math.min(width, height),
    borderBottomLeftRadius: (morphVariants[0].bl / 100) * Math.min(width, height),
  };

  const renderAccessory = () => {
    switch (type) {
      case 'budget_helper':
      case 'finance':
        return <RoundGlasses size={size} />;
      case 'study_buddy':
        return <SquareGlasses size={size} />;
      case 'fitness_coach':
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Blob body - flat solid color */}
      <Animated.View
        style={[
          styles.blob,
          { width, height, backgroundColor: hexColor },
          animated ? blobStyle : staticBlobStyle,
        ]}
      />

      {/* Face layer */}
      <View style={styles.faceContainer}>
        {/* Eyes or glasses */}
        {eyeConfig.hasGlasses && (type === 'budget_helper' || type === 'finance') ? (
          <RoundGlasses size={size} />
        ) : eyeConfig.hasGlasses && type === 'study_buddy' ? (
          <>
            <Eyes eyeSize={eyeConfig.eyeSize} eyeGap={eyeConfig.eyeGap} marginBottom={Math.max(1, Math.round(4 * ({ xs: 0.3, small: 0.5, medium: 0.75, large: 1 }[size] || 0.75)))} />
            <View style={{ position: 'absolute', top: '32%' }}>
              <SquareGlasses size={size} />
            </View>
          </>
        ) : (
          <Eyes eyeSize={eyeConfig.eyeSize} eyeGap={eyeConfig.eyeGap} marginBottom={Math.max(1, Math.round(4 * ({ xs: 0.3, small: 0.5, medium: 0.75, large: 1 }[size] || 0.75)))} />
        )}

        {/* Mouth - not for budget helper/finance (glasses are the face) */}
        {type !== 'budget_helper' && type !== 'finance' && <Mouth size={size} />}
      </View>
    </View>
  );
}

// Animated slime component that supports color transitions
export function AnimatedSlime({
  color = 'mint',
  type = 'base',
  size = 'medium',
  animated = true,
  hideAccessories = false,
}: SlimeProps) {
  return <Slime color={color} type={type} size={size} animated={animated} hideAccessories={hideAccessories} />;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
  },
  faceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Eyes
  eyesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eye: {
    backgroundColor: '#1a1a1a',
  },
  // Mouth
  mouthContainer: {},
  mouth: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(26, 26, 26, 0.5)',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  // Headband
  headband: {
    position: 'absolute',
    top: '8%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headbandStripe: {
    width: '80%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  // Glasses
  glassesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundLens: {
    borderColor: '#3d3d3d',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareLens: {
    borderWidth: 2.5,
    borderColor: '#4A5568',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassBridge: {
    backgroundColor: '#3d3d3d',
    marginHorizontal: 2,
  },
  glassPupil: {
    backgroundColor: '#1a1a1a',
  },
});
