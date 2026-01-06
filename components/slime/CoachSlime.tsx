import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';
import { colors } from '@/constants/colors';

interface CoachSlimeProps {
  size?: number;
  expression?: 'happy' | 'motivated' | 'proud' | 'thinking';
}

export default function CoachSlime({
  size = 80,
  expression = 'motivated',
}: CoachSlimeProps) {
  const scale = size / 80;
  const bodyColor = colors.slimeCoach; // coral/peach

  // Eye expressions
  const getEyes = () => {
    switch (expression) {
      case 'motivated':
        return (
          <>
            {/* Determined eyes - slightly angled */}
            <Path
              d="M22 36 Q28 30 34 36"
              stroke="#2D3436"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M46 36 Q52 30 58 36"
              stroke="#2D3436"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* Small sparkle */}
            <Circle cx="28" cy="32" r="2" fill="white" />
            <Circle cx="52" cy="32" r="2" fill="white" />
          </>
        );
      case 'proud':
        return (
          <>
            {/* Proud closed eyes */}
            <Path
              d="M22 38 Q28 32 34 38"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M46 38 Q52 32 58 38"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 'thinking':
        return (
          <>
            {/* One eye open, one squinting */}
            <Circle cx="28" cy="36" r="5" fill="#2D3436" />
            <Circle cx="29" cy="35" r="2" fill="white" />
            <Path
              d="M46 38 Q52 34 58 38"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 'happy':
      default:
        return (
          <>
            {/* Wide happy eyes */}
            <Ellipse cx="28" cy="36" rx="5" ry="6" fill="#2D3436" />
            <Ellipse cx="52" cy="36" rx="5" ry="6" fill="#2D3436" />
            <Circle cx="30" cy="34" r="2" fill="white" />
            <Circle cx="54" cy="34" r="2" fill="white" />
          </>
        );
    }
  };

  // Mouth expressions
  const getMouth = () => {
    switch (expression) {
      case 'motivated':
        return (
          <Path
            d="M30 50 Q40 60 50 50"
            stroke="#2D3436"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        );
      case 'proud':
        return (
          <Path
            d="M32 52 Q40 58 48 52"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        );
      case 'thinking':
        return (
          <Ellipse cx="45" cy="52" rx="4" ry="3" fill="#2D3436" />
        );
      case 'happy':
      default:
        return (
          <Path
            d="M32 50 Q40 58 48 50"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={{ transform: [{ scale }] }}
      >
        {/* Body - slightly wider/buffer blob shape */}
        <Path
          d="M6 48
             Q2 32 12 22
             Q24 6 40 6
             Q56 6 68 22
             Q78 32 74 48
             Q72 65 56 72
             Q40 78 24 72
             Q8 65 6 48 Z"
          fill={bodyColor}
        />

        {/* Body highlight */}
        <Ellipse cx="22" cy="22" rx="10" ry="6" fill="white" opacity={0.35} />

        {/* Headband */}
        <G>
          {/* Main band */}
          <Path
            d="M8 20
               Q20 12 40 12
               Q60 12 72 20
               Q60 16 40 16
               Q20 16 8 20 Z"
            fill="#FF6B6B"
          />
          {/* Band stripe */}
          <Path
            d="M12 18 Q40 10 68 18"
            stroke="white"
            strokeWidth="2"
            fill="none"
            opacity={0.6}
          />
        </G>

        {/* Face */}
        {getEyes()}
        {getMouth()}

        {/* Cheek blush - slightly more intense for coach */}
        <Ellipse cx="16" cy="46" rx="6" ry="4" fill="#FF9999" opacity={0.5} />
        <Ellipse cx="64" cy="46" rx="6" ry="4" fill="#FF9999" opacity={0.5} />

        {/* Optional: small sweat drop when motivated */}
        {expression === 'motivated' && (
          <Path
            d="M68 28 Q70 32 68 36 Q66 32 68 28 Z"
            fill="#87CEEB"
            opacity={0.7}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
