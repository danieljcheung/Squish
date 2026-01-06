import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import { colors } from '@/constants/colors';

interface BaseSlimeProps {
  size?: number;
  color?: string;
  expression?: 'happy' | 'excited' | 'sleepy' | 'neutral';
}

export default function BaseSlime({
  size = 80,
  color = colors.mint,
  expression = 'happy',
}: BaseSlimeProps) {
  const scale = size / 80;

  // Eye positions based on expression
  const getEyes = () => {
    switch (expression) {
      case 'excited':
        return (
          <>
            {/* Wide happy eyes */}
            <Ellipse cx="30" cy="35" rx="6" ry="7" fill="#2D3436" />
            <Ellipse cx="50" cy="35" rx="6" ry="7" fill="#2D3436" />
            {/* Eye shine */}
            <Circle cx="32" cy="33" r="2" fill="white" />
            <Circle cx="52" cy="33" r="2" fill="white" />
          </>
        );
      case 'sleepy':
        return (
          <>
            {/* Closed happy eyes (curved lines) */}
            <Path
              d="M24 36 Q30 32 36 36"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M44 36 Q50 32 56 36"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
      case 'neutral':
        return (
          <>
            {/* Simple dot eyes */}
            <Circle cx="30" cy="36" r="4" fill="#2D3436" />
            <Circle cx="50" cy="36" r="4" fill="#2D3436" />
            <Circle cx="31" cy="35" r="1.5" fill="white" />
            <Circle cx="51" cy="35" r="1.5" fill="white" />
          </>
        );
      case 'happy':
      default:
        return (
          <>
            {/* Happy curved eyes */}
            <Path
              d="M24 38 Q30 32 36 38"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M44 38 Q50 32 56 38"
              stroke="#2D3436"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </>
        );
    }
  };

  // Mouth based on expression
  const getMouth = () => {
    switch (expression) {
      case 'excited':
        return (
          <Path
            d="M32 48 Q40 56 48 48"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        );
      case 'sleepy':
        return (
          <Ellipse cx="40" cy="50" rx="4" ry="3" fill="#2D3436" />
        );
      case 'neutral':
        return (
          <Path
            d="M35 50 L45 50"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      case 'happy':
      default:
        return (
          <Path
            d="M34 48 Q40 54 46 48"
            stroke="#2D3436"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        );
    }
  };

  // Cheek blush
  const getBlush = () => (
    <>
      <Ellipse cx="20" cy="44" rx="5" ry="3" fill="#FFB8B8" opacity={0.6} />
      <Ellipse cx="60" cy="44" rx="5" ry="3" fill="#FFB8B8" opacity={0.6} />
    </>
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={{ transform: [{ scale }] }}
      >
        {/* Body - blob shape */}
        <Path
          d="M10 50
             Q5 35 15 25
             Q25 10 40 10
             Q55 10 65 25
             Q75 35 70 50
             Q68 65 55 70
             Q40 75 25 70
             Q12 65 10 50 Z"
          fill={color}
        />

        {/* Highlight/shine on body */}
        <Ellipse cx="25" cy="25" rx="8" ry="5" fill="white" opacity={0.4} />

        {/* Face */}
        {getEyes()}
        {getMouth()}
        {getBlush()}
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
