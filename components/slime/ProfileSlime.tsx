import React from 'react';
import { View, StyleSheet } from 'react-native';
import Slime, { SlimeColor, SlimeType, SlimeSize } from './Slime';

interface ProfileSlimeProps {
  color?: SlimeColor;
  type?: SlimeType;
  size?: number;
  animated?: boolean;
  showBackground?: boolean;
}

// Generate a lighter pastel background from slime color (more visible)
const getBackgroundColor = (slimeColor: SlimeColor): string => {
  const backgroundMap: Record<SlimeColor, string> = {
    mint: 'rgba(186, 233, 209, 0.4)',      // #bae9d1 at 40%
    peach: 'rgba(255, 212, 190, 0.4)',     // #FFD4BE at 40%
    lavender: 'rgba(212, 196, 232, 0.4)',  // #D4C4E8 at 40%
    skyBlue: 'rgba(184, 217, 240, 0.4)',   // #B8D9F0 at 40%
    coral: 'rgba(255, 184, 184, 0.4)',     // #FFB8B8 at 40%
    lemon: 'rgba(240, 232, 160, 0.4)',     // #F0E8A0 at 40%
    rose: 'rgba(240, 196, 212, 0.4)',      // #F0C4D4 at 40%
    sage: 'rgba(196, 217, 196, 0.4)',      // #C4D9C4 at 40%
  };
  return backgroundMap[slimeColor] || backgroundMap.mint;
};

// Get the appropriate slime size and scale factor for a given container size
const getSlimeConfig = (containerSize: number): { slimeSize: SlimeSize; scale: number } => {
  // Slime SIZE_CONFIG dimensions (width x height):
  // xs: 48x38, small: 80x64, medium: 120x96, large: 160x128

  // We want the slime to be about 70% of the container size to show the background
  const targetSize = containerSize * 0.7;

  if (containerSize <= 56) {
    // For small containers, use xs and scale down
    return { slimeSize: 'xs', scale: targetSize / 48 };
  } else if (containerSize <= 96) {
    // For medium containers, use small and scale
    return { slimeSize: 'small', scale: targetSize / 80 };
  } else if (containerSize <= 140) {
    // For larger containers, use medium and scale
    return { slimeSize: 'medium', scale: targetSize / 120 };
  } else {
    // For very large containers, use large and scale
    return { slimeSize: 'large', scale: targetSize / 160 };
  }
};

export default function ProfileSlime({
  color = 'mint',
  type = 'base',
  size = 48,
  animated = false,
  showBackground = true,
}: ProfileSlimeProps) {
  const backgroundColor = getBackgroundColor(color);
  const { slimeSize, scale } = getSlimeConfig(size);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: showBackground ? backgroundColor : 'transparent',
        },
      ]}
    >
      <View style={{ transform: [{ scale }] }}>
        <Slime
          color={color}
          type={type}
          size={slimeSize}
          animated={animated}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
