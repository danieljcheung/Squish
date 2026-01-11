import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureUpdateEvent, PanGestureHandlerEventPayload } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  cancelAnimation,
  Easing,
  runOnJS,
  useFrameCallback,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { radius } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Agent } from '@/types';
import { SlimeColor, SlimeType } from './Slime';

// Slime dimensions (75% of home screen 140x112)
const SLIME_WIDTH = 105;
const SLIME_HEIGHT = 84;

// Physics constants (EXACT same as InteractiveSlime)
const BODY_SPRING = { damping: 12, stiffness: 80, mass: 0.8 };
const SNAPBACK_SPRING = { damping: 8, stiffness: 120, mass: 0.7 };
const WOBBLE_SPRING = { damping: 6, stiffness: 90, mass: 0.6 };
const RETURN_SPRING = { damping: 6, stiffness: 12, mass: 1.5 };
const JELLY_SPRING = { damping: 8, stiffness: 50, mass: 0.9 };
const FRICTION = 0.992;
const BOUNCE_DAMPING = 0.32;
const MIN_VELOCITY = 20;
const FLICK_VELOCITY_SCALE = 0.75;
const IMPACT_SQUISH_DURATION = 120;
const IMPACT_RECOVERY_DURATION = 320;

// Collision radius for each slime (treat as circles)
// Using ~75% of slime width as collision diameter
const SLIME_RADIUS = SLIME_WIDTH * 0.45;
// Minimum distance = sum of both radii
const MIN_DISTANCE = SLIME_RADIUS * 2;

interface DualInteractiveSlimeProps {
  fitnessAgent: Agent;
  financeAgent: Agent;
  containerWidth: number;
  containerHeight: number;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

// Get hex color from slime color name
const getSlimeColor = (colorName: SlimeColor): string => {
  return colors.slime[colorName] || colors.slime.mint;
};

// Get morph variants by type
const MORPH_VARIANTS: Record<string, { tl: number; tr: number; br: number; bl: number }[]> = {
  fitness_coach: [
    { tl: 40, tr: 60, br: 70, bl: 30 },
    { tl: 45, tr: 55, br: 65, bl: 35 },
    { tl: 38, tr: 62, br: 72, bl: 28 },
  ],
  finance: [
    { tl: 30, tr: 70, br: 70, bl: 30 },
    { tl: 35, tr: 65, br: 65, bl: 35 },
    { tl: 28, tr: 72, br: 72, bl: 28 },
  ],
};

export default function DualInteractiveSlime({
  fitnessAgent,
  financeAgent,
  containerWidth,
  containerHeight,
  onGestureStart,
  onGestureEnd,
}: DualInteractiveSlimeProps) {
  // Get theme colors for dark mode support
  const { colors: themeColors } = useTheme();

  // Get agent properties
  const fitnessColor = (fitnessAgent.persona_json?.slime_color || 'mint') as SlimeColor;
  const financeColor = (financeAgent.persona_json?.slime_color || 'lavender') as SlimeColor;
  const fitnessName = fitnessAgent.persona_json?.name || 'Coach';
  const financeName = financeAgent.persona_json?.name || 'Penny';

  // Home positions (-25% and +25% of container width from center)
  const homeX1 = -containerWidth * 0.18;
  const homeX2 = containerWidth * 0.18;
  const homeY = 0;

  // Calculate bounds
  const padding = 4;
  const bounds = {
    minX: -(containerWidth / 2 - SLIME_WIDTH / 2 - padding),
    maxX: containerWidth / 2 - SLIME_WIDTH / 2 - padding,
    minY: -(containerHeight / 2 - SLIME_HEIGHT / 2 - padding),
    maxY: containerHeight / 2 - SLIME_HEIGHT / 2 - padding,
  };

  // ============================================
  // SLIME 1 (FITNESS) STATE
  // ============================================
  // GRAB POINT - where finger is pulling (follows finger directly)
  const grab1X = useSharedValue(homeX1);
  const grab1Y = useSharedValue(homeY);
  // BODY CENTER - the main slime body (lags behind grab point)
  const body1X = useSharedValue(homeX1);
  const body1Y = useSharedValue(homeY);
  // Stretch amount (difference between grab and body)
  const stretch1X = useSharedValue(0);
  const stretch1Y = useSharedValue(0);
  // Wobble for snap-back ripple
  const wobble1X = useSharedValue(0);
  const wobble1Y = useSharedValue(0);
  const wobble1Scale = useSharedValue(1);
  const wobble1SkewX = useSharedValue(0);
  const wobble1SkewY = useSharedValue(0);
  // Press squish
  const press1Squish = useSharedValue(0);
  // Velocity and state
  const slime1VelX = useSharedValue(0);
  const slime1VelY = useSharedValue(0);
  const slime1IsDragging = useSharedValue(false);
  const slime1IsFlicking = useSharedValue(false);
  const slime1LastInteraction = useSharedValue(Date.now());
  // Impact and flight
  const slime1ImpactX = useSharedValue(0);
  const slime1ImpactY = useSharedValue(0);
  const slime1FlightX = useSharedValue(0);
  const slime1FlightY = useSharedValue(0);
  // Edge collision
  const slime1EdgeLeft = useSharedValue(0);
  const slime1EdgeRight = useSharedValue(0);
  const slime1EdgeTop = useSharedValue(0);
  const slime1EdgeBottom = useSharedValue(0);
  // Idle animations
  const slime1Breathing = useSharedValue(0);
  const slime1Morph = useSharedValue(0);
  const slime1Squish = useSharedValue(0);
  const slime1Blink = useSharedValue(0);
  // Gesture start position (captured when drag begins)
  const slime1StartX = useSharedValue(homeX1);
  const slime1StartY = useSharedValue(homeY);

  // ============================================
  // SLIME 2 (FINANCE) STATE
  // ============================================
  // GRAB POINT - where finger is pulling (follows finger directly)
  const grab2X = useSharedValue(homeX2);
  const grab2Y = useSharedValue(homeY);
  // BODY CENTER - the main slime body (lags behind grab point)
  const body2X = useSharedValue(homeX2);
  const body2Y = useSharedValue(homeY);
  // Stretch amount (difference between grab and body)
  const stretch2X = useSharedValue(0);
  const stretch2Y = useSharedValue(0);
  // Wobble for snap-back ripple
  const wobble2X = useSharedValue(0);
  const wobble2Y = useSharedValue(0);
  const wobble2Scale = useSharedValue(1);
  const wobble2SkewX = useSharedValue(0);
  const wobble2SkewY = useSharedValue(0);
  // Press squish
  const press2Squish = useSharedValue(0);
  // Velocity and state
  const slime2VelX = useSharedValue(0);
  const slime2VelY = useSharedValue(0);
  const slime2IsDragging = useSharedValue(false);
  const slime2IsFlicking = useSharedValue(false);
  const slime2LastInteraction = useSharedValue(Date.now());
  // Impact and flight
  const slime2ImpactX = useSharedValue(0);
  const slime2ImpactY = useSharedValue(0);
  const slime2FlightX = useSharedValue(0);
  const slime2FlightY = useSharedValue(0);
  // Edge collision
  const slime2EdgeLeft = useSharedValue(0);
  const slime2EdgeRight = useSharedValue(0);
  const slime2EdgeTop = useSharedValue(0);
  const slime2EdgeBottom = useSharedValue(0);
  // Idle animations
  const slime2Breathing = useSharedValue(0);
  const slime2Morph = useSharedValue(0);
  const slime2Squish = useSharedValue(0);
  const slime2Blink = useSharedValue(0);
  // Gesture start position (captured when drag begins)
  const slime2StartX = useSharedValue(homeX2);
  const slime2StartY = useSharedValue(homeY);

  // Start idle animations
  useEffect(() => {
    // Slime 1 animations
    slime1Breathing.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    slime1Morph.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    slime1Squish.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Slime 2 animations (offset timing for variety)
    slime2Breathing.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    slime2Morph.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
          withTiming(2, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    slime2Squish.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );

    // Blinking intervals
    const blinkInterval1 = setInterval(() => {
      if (!slime1IsDragging.value) {
        slime1Blink.value = withSequence(
          withTiming(1, { duration: 80 }),
          withDelay(50, withTiming(0, { duration: 80 }))
        );
      }
    }, 3500 + Math.random() * 2000);

    const blinkInterval2 = setInterval(() => {
      if (!slime2IsDragging.value) {
        slime2Blink.value = withSequence(
          withTiming(1, { duration: 80 }),
          withDelay(50, withTiming(0, { duration: 80 }))
        );
      }
    }, 4000 + Math.random() * 2000);

    return () => {
      clearInterval(blinkInterval1);
      clearInterval(blinkInterval2);
    };
  }, []);

  // Return to home position after inactivity
  useEffect(() => {
    const checkReturn = setInterval(() => {
      const now = Date.now();

      // Slime 1 - return to home
      if (!slime1IsDragging.value && !slime1IsFlicking.value && now - slime1LastInteraction.value > 2500) {
        grab1X.value = withSpring(homeX1, RETURN_SPRING);
        grab1Y.value = withSpring(homeY, RETURN_SPRING);
        body1X.value = withSpring(homeX1, RETURN_SPRING);
        body1Y.value = withSpring(homeY, RETURN_SPRING);
      }

      // Slime 2 - return to home
      if (!slime2IsDragging.value && !slime2IsFlicking.value && now - slime2LastInteraction.value > 2500) {
        grab2X.value = withSpring(homeX2, RETURN_SPRING);
        grab2Y.value = withSpring(homeY, RETURN_SPRING);
        body2X.value = withSpring(homeX2, RETURN_SPRING);
        body2Y.value = withSpring(homeY, RETURN_SPRING);
      }
    }, 500);

    return () => clearInterval(checkReturn);
  }, [homeX1, homeX2]);

  // Trigger snap-back wobble when released (stress-ball feel)
  const triggerSnapBackWobble1 = (dx: number, dy: number, vx: number, vy: number) => {
    'worklet';
    const stretchMagnitude = Math.sqrt(dx * dx + dy * dy);
    const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
    const wobbleIntensity = Math.min(0.6, stretchMagnitude / 80);
    const velocityIntensity = Math.min(0.6, velocityMagnitude / 2000);
    const intensity = Math.max(wobbleIntensity, velocityIntensity);

    // Position wobble
    wobble1X.value = withSequence(
      withSpring(-dx * 0.15, WOBBLE_SPRING),
      withSpring(dx * 0.06, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
    wobble1Y.value = withSequence(
      withSpring(-dy * 0.15, WOBBLE_SPRING),
      withSpring(dy * 0.06, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );

    // Scale wobble
    wobble1Scale.value = withSequence(
      withSpring(1 + intensity * 0.06, WOBBLE_SPRING),
      withSpring(1 - intensity * 0.03, WOBBLE_SPRING),
      withSpring(1, WOBBLE_SPRING)
    );

    // Skew wobble
    const skewAmount = intensity * 6;
    const angle = Math.atan2(dy, dx);
    wobble1SkewX.value = withSequence(
      withSpring(-Math.cos(angle) * skewAmount, WOBBLE_SPRING),
      withSpring(Math.cos(angle) * skewAmount * 0.3, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
    wobble1SkewY.value = withSequence(
      withSpring(-Math.sin(angle) * skewAmount, WOBBLE_SPRING),
      withSpring(Math.sin(angle) * skewAmount * 0.3, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
  };

  const triggerSnapBackWobble2 = (dx: number, dy: number, vx: number, vy: number) => {
    'worklet';
    const stretchMagnitude = Math.sqrt(dx * dx + dy * dy);
    const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
    const wobbleIntensity = Math.min(0.6, stretchMagnitude / 80);
    const velocityIntensity = Math.min(0.6, velocityMagnitude / 2000);
    const intensity = Math.max(wobbleIntensity, velocityIntensity);

    // Position wobble
    wobble2X.value = withSequence(
      withSpring(-dx * 0.15, WOBBLE_SPRING),
      withSpring(dx * 0.06, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
    wobble2Y.value = withSequence(
      withSpring(-dy * 0.15, WOBBLE_SPRING),
      withSpring(dy * 0.06, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );

    // Scale wobble
    wobble2Scale.value = withSequence(
      withSpring(1 + intensity * 0.06, WOBBLE_SPRING),
      withSpring(1 - intensity * 0.03, WOBBLE_SPRING),
      withSpring(1, WOBBLE_SPRING)
    );

    // Skew wobble
    const skewAmount = intensity * 6;
    const angle = Math.atan2(dy, dx);
    wobble2SkewX.value = withSequence(
      withSpring(-Math.cos(angle) * skewAmount, WOBBLE_SPRING),
      withSpring(Math.cos(angle) * skewAmount * 0.3, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
    wobble2SkewY.value = withSequence(
      withSpring(-Math.sin(angle) * skewAmount, WOBBLE_SPRING),
      withSpring(Math.sin(angle) * skewAmount * 0.3, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
  };

  // Update edge collision
  const updateEdgeCollision1 = (x: number, y: number) => {
    'worklet';
    const edgePadding = 8;
    const collisionDepth = 20;

    if (x <= bounds.minX + edgePadding) {
      slime1EdgeLeft.value = Math.min(1, (bounds.minX + edgePadding - x) / collisionDepth + 0.3);
    } else {
      slime1EdgeLeft.value = withSpring(0, JELLY_SPRING);
    }
    if (x >= bounds.maxX - edgePadding) {
      slime1EdgeRight.value = Math.min(1, (x - (bounds.maxX - edgePadding)) / collisionDepth + 0.3);
    } else {
      slime1EdgeRight.value = withSpring(0, JELLY_SPRING);
    }
    if (y <= bounds.minY + edgePadding) {
      slime1EdgeTop.value = Math.min(1, (bounds.minY + edgePadding - y) / collisionDepth + 0.3);
    } else {
      slime1EdgeTop.value = withSpring(0, JELLY_SPRING);
    }
    if (y >= bounds.maxY - edgePadding) {
      slime1EdgeBottom.value = Math.min(1, (y - (bounds.maxY - edgePadding)) / collisionDepth + 0.3);
    } else {
      slime1EdgeBottom.value = withSpring(0, JELLY_SPRING);
    }
  };

  const updateEdgeCollision2 = (x: number, y: number) => {
    'worklet';
    const edgePadding = 8;
    const collisionDepth = 20;

    if (x <= bounds.minX + edgePadding) {
      slime2EdgeLeft.value = Math.min(1, (bounds.minX + edgePadding - x) / collisionDepth + 0.3);
    } else {
      slime2EdgeLeft.value = withSpring(0, JELLY_SPRING);
    }
    if (x >= bounds.maxX - edgePadding) {
      slime2EdgeRight.value = Math.min(1, (x - (bounds.maxX - edgePadding)) / collisionDepth + 0.3);
    } else {
      slime2EdgeRight.value = withSpring(0, JELLY_SPRING);
    }
    if (y <= bounds.minY + edgePadding) {
      slime2EdgeTop.value = Math.min(1, (bounds.minY + edgePadding - y) / collisionDepth + 0.3);
    } else {
      slime2EdgeTop.value = withSpring(0, JELLY_SPRING);
    }
    if (y >= bounds.maxY - edgePadding) {
      slime2EdgeBottom.value = Math.min(1, (y - (bounds.maxY - edgePadding)) / collisionDepth + 0.3);
    } else {
      slime2EdgeBottom.value = withSpring(0, JELLY_SPRING);
    }
  };

  // Physics simulation for both slimes
  useFrameCallback(() => {
    'worklet';
    const dt = 1 / 60;

    // ============================================
    // SLIME 1 PHYSICS
    // ============================================
    if (slime1IsFlicking.value && !slime1IsDragging.value) {
      slime1VelX.value *= FRICTION;
      slime1VelY.value *= FRICTION;

      const speed1 = Math.sqrt(slime1VelX.value ** 2 + slime1VelY.value ** 2);

      // Flight deformation
      if (speed1 > MIN_VELOCITY * 2) {
        slime1FlightX.value = (slime1VelX.value / speed1) * Math.min(1, speed1 / 800) * 0.15;
        slime1FlightY.value = (slime1VelY.value / speed1) * Math.min(1, speed1 / 800) * 0.15;
      } else {
        slime1FlightX.value *= 0.9;
        slime1FlightY.value *= 0.9;
      }

      if (speed1 < MIN_VELOCITY) {
        slime1IsFlicking.value = false;
        slime1VelX.value = 0;
        slime1VelY.value = 0;
        slime1FlightX.value = 0;
        slime1FlightY.value = 0;
        // Settle with gentle spring
        body1X.value = withSpring(body1X.value, JELLY_SPRING);
        body1Y.value = withSpring(body1Y.value, JELLY_SPRING);
        grab1X.value = withSpring(body1X.value, JELLY_SPRING);
        grab1Y.value = withSpring(body1Y.value, JELLY_SPRING);
      } else {
        let newX = body1X.value + slime1VelX.value * dt;
        let newY = body1Y.value + slime1VelY.value * dt;
        let bounced = false;

        // Wall bounces
        if (newX <= bounds.minX) {
          newX = bounds.minX;
          slime1VelX.value = -slime1VelX.value * BOUNCE_DAMPING;
          bounced = true;
          slime1ImpactX.value = withSequence(
            withTiming(-1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime1EdgeLeft.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        } else if (newX >= bounds.maxX) {
          newX = bounds.maxX;
          slime1VelX.value = -slime1VelX.value * BOUNCE_DAMPING;
          bounced = true;
          slime1ImpactX.value = withSequence(
            withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime1EdgeRight.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        }

        if (newY <= bounds.minY) {
          newY = bounds.minY;
          slime1VelY.value = -slime1VelY.value * BOUNCE_DAMPING;
          bounced = true;
          slime1ImpactY.value = withSequence(
            withTiming(-1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime1EdgeTop.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        } else if (newY >= bounds.maxY) {
          newY = bounds.maxY;
          slime1VelY.value = -slime1VelY.value * BOUNCE_DAMPING;
          bounced = true;
          slime1ImpactY.value = withSequence(
            withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime1EdgeBottom.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        }

        // Wobble on wall bounce
        if (bounced) {
          const impactIntensity = Math.min(0.9, speed1 / 500);
          wobble1Scale.value = withSequence(
            withTiming(1 - impactIntensity * 0.1, { duration: 60 }),
            withTiming(1 + impactIntensity * 0.03, { duration: 150, easing: Easing.out(Easing.quad) }),
            withSpring(1, { damping: 15, stiffness: 80 })
          );
        }

        body1X.value = newX;
        body1Y.value = newY;
        grab1X.value = newX;
        grab1Y.value = newY;
      }
    }

    // ============================================
    // SLIME 2 PHYSICS
    // ============================================
    if (slime2IsFlicking.value && !slime2IsDragging.value) {
      slime2VelX.value *= FRICTION;
      slime2VelY.value *= FRICTION;

      const speed2 = Math.sqrt(slime2VelX.value ** 2 + slime2VelY.value ** 2);

      // Flight deformation
      if (speed2 > MIN_VELOCITY * 2) {
        slime2FlightX.value = (slime2VelX.value / speed2) * Math.min(1, speed2 / 800) * 0.15;
        slime2FlightY.value = (slime2VelY.value / speed2) * Math.min(1, speed2 / 800) * 0.15;
      } else {
        slime2FlightX.value *= 0.9;
        slime2FlightY.value *= 0.9;
      }

      if (speed2 < MIN_VELOCITY) {
        slime2IsFlicking.value = false;
        slime2VelX.value = 0;
        slime2VelY.value = 0;
        slime2FlightX.value = 0;
        slime2FlightY.value = 0;
        // Settle with gentle spring
        body2X.value = withSpring(body2X.value, JELLY_SPRING);
        body2Y.value = withSpring(body2Y.value, JELLY_SPRING);
        grab2X.value = withSpring(body2X.value, JELLY_SPRING);
        grab2Y.value = withSpring(body2Y.value, JELLY_SPRING);
      } else {
        let newX = body2X.value + slime2VelX.value * dt;
        let newY = body2Y.value + slime2VelY.value * dt;
        let bounced = false;

        // Wall bounces
        if (newX <= bounds.minX) {
          newX = bounds.minX;
          slime2VelX.value = -slime2VelX.value * BOUNCE_DAMPING;
          bounced = true;
          slime2ImpactX.value = withSequence(
            withTiming(-1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2EdgeLeft.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        } else if (newX >= bounds.maxX) {
          newX = bounds.maxX;
          slime2VelX.value = -slime2VelX.value * BOUNCE_DAMPING;
          bounced = true;
          slime2ImpactX.value = withSequence(
            withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2EdgeRight.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        }

        if (newY <= bounds.minY) {
          newY = bounds.minY;
          slime2VelY.value = -slime2VelY.value * BOUNCE_DAMPING;
          bounced = true;
          slime2ImpactY.value = withSequence(
            withTiming(-1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2EdgeTop.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        } else if (newY >= bounds.maxY) {
          newY = bounds.maxY;
          slime2VelY.value = -slime2VelY.value * BOUNCE_DAMPING;
          bounced = true;
          slime2ImpactY.value = withSequence(
            withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2EdgeBottom.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        }

        // Wobble on wall bounce
        if (bounced) {
          const impactIntensity = Math.min(0.9, speed2 / 500);
          wobble2Scale.value = withSequence(
            withTiming(1 - impactIntensity * 0.1, { duration: 60 }),
            withTiming(1 + impactIntensity * 0.03, { duration: 150, easing: Easing.out(Easing.quad) }),
            withSpring(1, { damping: 15, stiffness: 80 })
          );
        }

        body2X.value = newX;
        body2Y.value = newY;
        grab2X.value = newX;
        grab2Y.value = newY;
      }
    }

    // ============================================
    // COLLISION DETECTION BETWEEN SLIMES (EVERY FRAME)
    // ============================================
    // Calculate distance between slime centers
    const dx = body2X.value - body1X.value;
    const dy = body2Y.value - body1Y.value;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if slimes are overlapping (treat as circles)
    if (dist < MIN_DISTANCE && dist > 0.001) {
      // Normalize collision direction
      const nx = dx / dist;
      const ny = dy / dist;

      // Calculate overlap amount
      const overlap = MIN_DISTANCE - dist;

      // STEP 1: SEPARATE SLIMES IMMEDIATELY (no visual overlap ever)
      // If one is dragging, push the other one entirely
      // If both are free, split the separation 50/50
      const slime1Dragging = slime1IsDragging.value;
      const slime2Dragging = slime2IsDragging.value;

      if (slime1Dragging && !slime2Dragging) {
        // Slime 1 is being dragged - push slime 2 away entirely
        body2X.value += nx * overlap;
        body2Y.value += ny * overlap;
        grab2X.value += nx * overlap;
        grab2Y.value += ny * overlap;
      } else if (slime2Dragging && !slime1Dragging) {
        // Slime 2 is being dragged - push slime 1 away entirely
        body1X.value -= nx * overlap;
        body1Y.value -= ny * overlap;
        grab1X.value -= nx * overlap;
        grab1Y.value -= ny * overlap;
      } else if (!slime1Dragging && !slime2Dragging) {
        // Neither is dragging - split the separation
        const halfOverlap = overlap * 0.5;
        body1X.value -= nx * halfOverlap;
        body1Y.value -= ny * halfOverlap;
        grab1X.value -= nx * halfOverlap;
        grab1Y.value -= ny * halfOverlap;
        body2X.value += nx * halfOverlap;
        body2Y.value += ny * halfOverlap;
        grab2X.value += nx * halfOverlap;
        grab2Y.value += ny * halfOverlap;
      }
      // If both are dragging, don't separate (let user control)

      // STEP 2: APPLY SQUISH DEFORMATION (always on contact)
      // Use overlap amount to determine squish intensity (more overlap = more squish)
      const overlapIntensity = Math.min(1, overlap / 20);
      if (Math.abs(nx) > Math.abs(ny)) {
        // Horizontal collision - squish horizontally
        slime1ImpactX.value = nx * overlapIntensity * 0.5;
        slime2ImpactX.value = -nx * overlapIntensity * 0.5;
      } else {
        // Vertical collision - squish vertically
        slime1ImpactY.value = ny * overlapIntensity * 0.5;
        slime2ImpactY.value = -ny * overlapIntensity * 0.5;
      }

      // STEP 3: APPLY BOUNCE VELOCITY (only if approaching with speed)
      const relVelX = slime2VelX.value - slime1VelX.value;
      const relVelY = slime2VelY.value - slime1VelY.value;
      const relVelDot = relVelX * nx + relVelY * ny;

      if (relVelDot < -10) {
        // Slimes approaching with velocity - apply bounce
        const impulse = relVelDot * (1 + BOUNCE_DAMPING);

        if (!slime1Dragging) {
          slime1VelX.value += impulse * nx * 0.5;
          slime1VelY.value += impulse * ny * 0.5;
          slime1IsFlicking.value = true;
        }
        if (!slime2Dragging) {
          slime2VelX.value -= impulse * nx * 0.5;
          slime2VelY.value -= impulse * ny * 0.5;
          slime2IsFlicking.value = true;
        }

        // Apply bounce squish animation
        const impactIntensity = Math.min(1, Math.abs(relVelDot) / 200);
        if (Math.abs(nx) > Math.abs(ny)) {
          slime1ImpactX.value = withSequence(
            withTiming(nx * impactIntensity, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2ImpactX.value = withSequence(
            withTiming(-nx * impactIntensity, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
        } else {
          slime1ImpactY.value = withSequence(
            withTiming(ny * impactIntensity, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2ImpactY.value = withSequence(
            withTiming(-ny * impactIntensity, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
        }

        // STEP 4: APPLY WOBBLE ANIMATION
        const collisionSpeed = Math.abs(relVelDot);
        wobble1Scale.value = withSequence(
          withTiming(1 - Math.min(0.12, collisionSpeed / 600), { duration: 60 }),
          withTiming(1 + Math.min(0.04, collisionSpeed / 2000), { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
        wobble2Scale.value = withSequence(
          withTiming(1 - Math.min(0.12, collisionSpeed / 600), { duration: 60 }),
          withTiming(1 + Math.min(0.04, collisionSpeed / 2000), { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      }
    } else {
      // No collision - reset squish values if not animating
      // This ensures squish goes away when slimes separate
      if (Math.abs(slime1ImpactX.value) < 0.1 && Math.abs(slime1ImpactY.value) < 0.1) {
        slime1ImpactX.value = 0;
        slime1ImpactY.value = 0;
      }
      if (Math.abs(slime2ImpactX.value) < 0.1 && Math.abs(slime2ImpactY.value) < 0.1) {
        slime2ImpactX.value = 0;
        slime2ImpactY.value = 0;
      }
    }
  });

  // ============================================
  // GESTURE HANDLERS
  // ============================================

  const panGesture1 = Gesture.Pan()
    .onBegin(() => {
      // Press squish - compress down like pressing a stress ball
      cancelAnimation(press1Squish);
      press1Squish.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) });
    })
    .onStart(() => {
      slime1IsDragging.value = true;
      slime1IsFlicking.value = false;

      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }

      // Cancel ongoing animations
      cancelAnimation(grab1X);
      cancelAnimation(grab1Y);
      cancelAnimation(body1X);
      cancelAnimation(body1Y);
      cancelAnimation(wobble1X);
      cancelAnimation(wobble1Y);
      cancelAnimation(wobble1Scale);
      cancelAnimation(wobble1SkewX);
      cancelAnimation(wobble1SkewY);
      cancelAnimation(stretch1X);
      cancelAnimation(stretch1Y);
      cancelAnimation(slime1ImpactX);
      cancelAnimation(slime1ImpactY);

      // Capture current position as gesture start (for correct wall boundaries)
      slime1StartX.value = body1X.value;
      slime1StartY.value = body1Y.value;

      // Reset flick-related values
      slime1VelX.value = 0;
      slime1VelY.value = 0;
      slime1FlightX.value = 0;
      slime1FlightY.value = 0;
      slime1ImpactX.value = 0;
      slime1ImpactY.value = 0;

      wobble1Scale.value = 1;
      wobble1SkewX.value = 0;
      wobble1SkewY.value = 0;
    })
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      // Calculate target position from captured start + translation (symmetric boundaries)
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, slime1StartX.value + event.translationX));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, slime1StartY.value + event.translationY));

      // Grab point follows finger IMMEDIATELY
      grab1X.value = clampedX;
      grab1Y.value = clampedY;

      // Body follows with SOFT spring - creates the stretchy lag
      body1X.value = withSpring(clampedX, BODY_SPRING);
      body1Y.value = withSpring(clampedY, BODY_SPRING);

      // Calculate current stretch
      stretch1X.value = clampedX - body1X.value;
      stretch1Y.value = clampedY - body1Y.value;

      // Update edge collision
      updateEdgeCollision1(body1X.value, body1Y.value);

      slime1LastInteraction.value = Date.now();
    })
    .onEnd((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      slime1IsDragging.value = false;

      // Calculate final stretch at release
      const finalStretchX = grab1X.value - body1X.value;
      const finalStretchY = grab1Y.value - body1Y.value;

      const flickSpeed = Math.sqrt(event.velocityX ** 2 + event.velocityY ** 2);
      const FLICK_THRESHOLD = 300;

      if (flickSpeed > FLICK_THRESHOLD) {
        // Start flick physics
        slime1IsFlicking.value = true;
        slime1VelX.value = event.velocityX * FLICK_VELOCITY_SCALE;
        slime1VelY.value = event.velocityY * FLICK_VELOCITY_SCALE;

        // Sync grab point to body for flicking
        grab1X.value = body1X.value;
        grab1Y.value = body1Y.value;

        // Clear stretch
        stretch1X.value = 0;
        stretch1Y.value = 0;

        // Initial launch wobble
        const launchIntensity = Math.min(0.5, flickSpeed / 1500);
        wobble1Scale.value = withSequence(
          withTiming(1 - launchIntensity * 0.05, { duration: 50 }),
          withSpring(1, WOBBLE_SPRING)
        );
      } else {
        // Normal release - settle in place
        const targetX = body1X.value;
        const targetY = body1Y.value;
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, targetY));

        // Grab point snaps to body with fast spring
        grab1X.value = withSpring(clampedX, SNAPBACK_SPRING);
        grab1Y.value = withSpring(clampedY, SNAPBACK_SPRING);

        // Body settles with jiggly spring
        body1X.value = withSpring(clampedX, {
          ...JELLY_SPRING,
          velocity: event.velocityX * 0.2,
        });
        body1Y.value = withSpring(clampedY, {
          ...JELLY_SPRING,
          velocity: event.velocityY * 0.2,
        });

        // Clear stretch
        stretch1X.value = withSpring(0, SNAPBACK_SPRING);
        stretch1Y.value = withSpring(0, SNAPBACK_SPRING);

        // Trigger snap-back wobble
        triggerSnapBackWobble1(finalStretchX, finalStretchY, event.velocityX, event.velocityY);
      }

      // Clear edge collision
      slime1EdgeLeft.value = withSpring(0, JELLY_SPRING);
      slime1EdgeRight.value = withSpring(0, JELLY_SPRING);
      slime1EdgeTop.value = withSpring(0, JELLY_SPRING);
      slime1EdgeBottom.value = withSpring(0, JELLY_SPRING);

      slime1LastInteraction.value = Date.now();
    })
    .onFinalize(() => {
      // Release press squish
      press1Squish.value = withSpring(0, { damping: 10, stiffness: 400 });

      if (onGestureEnd) {
        runOnJS(onGestureEnd)();
      }
    });

  const panGesture2 = Gesture.Pan()
    .onBegin(() => {
      // Press squish
      cancelAnimation(press2Squish);
      press2Squish.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) });
    })
    .onStart(() => {
      slime2IsDragging.value = true;
      slime2IsFlicking.value = false;

      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }

      // Cancel ongoing animations
      cancelAnimation(grab2X);
      cancelAnimation(grab2Y);
      cancelAnimation(body2X);
      cancelAnimation(body2Y);
      cancelAnimation(wobble2X);
      cancelAnimation(wobble2Y);
      cancelAnimation(wobble2Scale);
      cancelAnimation(wobble2SkewX);
      cancelAnimation(wobble2SkewY);
      cancelAnimation(stretch2X);
      cancelAnimation(stretch2Y);
      cancelAnimation(slime2ImpactX);
      cancelAnimation(slime2ImpactY);

      // Capture current position as gesture start (for correct wall boundaries)
      slime2StartX.value = body2X.value;
      slime2StartY.value = body2Y.value;

      // Reset flick-related values
      slime2VelX.value = 0;
      slime2VelY.value = 0;
      slime2FlightX.value = 0;
      slime2FlightY.value = 0;
      slime2ImpactX.value = 0;
      slime2ImpactY.value = 0;

      wobble2Scale.value = 1;
      wobble2SkewX.value = 0;
      wobble2SkewY.value = 0;
    })
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      // Calculate target position from captured start + translation (symmetric boundaries)
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, slime2StartX.value + event.translationX));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, slime2StartY.value + event.translationY));

      // Grab point follows finger IMMEDIATELY
      grab2X.value = clampedX;
      grab2Y.value = clampedY;

      // Body follows with SOFT spring
      body2X.value = withSpring(clampedX, BODY_SPRING);
      body2Y.value = withSpring(clampedY, BODY_SPRING);

      // Calculate current stretch
      stretch2X.value = clampedX - body2X.value;
      stretch2Y.value = clampedY - body2Y.value;

      // Update edge collision
      updateEdgeCollision2(body2X.value, body2Y.value);

      slime2LastInteraction.value = Date.now();
    })
    .onEnd((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      slime2IsDragging.value = false;

      // Calculate final stretch at release
      const finalStretchX = grab2X.value - body2X.value;
      const finalStretchY = grab2Y.value - body2Y.value;

      const flickSpeed = Math.sqrt(event.velocityX ** 2 + event.velocityY ** 2);
      const FLICK_THRESHOLD = 300;

      if (flickSpeed > FLICK_THRESHOLD) {
        // Start flick physics
        slime2IsFlicking.value = true;
        slime2VelX.value = event.velocityX * FLICK_VELOCITY_SCALE;
        slime2VelY.value = event.velocityY * FLICK_VELOCITY_SCALE;

        // Sync grab point to body
        grab2X.value = body2X.value;
        grab2Y.value = body2Y.value;

        // Clear stretch
        stretch2X.value = 0;
        stretch2Y.value = 0;

        // Initial launch wobble
        const launchIntensity = Math.min(0.5, flickSpeed / 1500);
        wobble2Scale.value = withSequence(
          withTiming(1 - launchIntensity * 0.05, { duration: 50 }),
          withSpring(1, WOBBLE_SPRING)
        );
      } else {
        // Normal release - settle in place
        const targetX = body2X.value;
        const targetY = body2Y.value;
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, targetY));

        // Grab point snaps to body
        grab2X.value = withSpring(clampedX, SNAPBACK_SPRING);
        grab2Y.value = withSpring(clampedY, SNAPBACK_SPRING);

        // Body settles with jiggly spring
        body2X.value = withSpring(clampedX, {
          ...JELLY_SPRING,
          velocity: event.velocityX * 0.2,
        });
        body2Y.value = withSpring(clampedY, {
          ...JELLY_SPRING,
          velocity: event.velocityY * 0.2,
        });

        // Clear stretch
        stretch2X.value = withSpring(0, SNAPBACK_SPRING);
        stretch2Y.value = withSpring(0, SNAPBACK_SPRING);

        // Trigger snap-back wobble
        triggerSnapBackWobble2(finalStretchX, finalStretchY, event.velocityX, event.velocityY);
      }

      // Clear edge collision
      slime2EdgeLeft.value = withSpring(0, JELLY_SPRING);
      slime2EdgeRight.value = withSpring(0, JELLY_SPRING);
      slime2EdgeTop.value = withSpring(0, JELLY_SPRING);
      slime2EdgeBottom.value = withSpring(0, JELLY_SPRING);

      slime2LastInteraction.value = Date.now();
    })
    .onFinalize(() => {
      // Release press squish
      press2Squish.value = withSpring(0, { damping: 10, stiffness: 400 });

      if (onGestureEnd) {
        runOnJS(onGestureEnd)();
      }
    });

  // ============================================
  // ANIMATED STYLES
  // ============================================

  // Slime 1 wrapper style - handles all transforms (position, scale, skew)
  const slime1WrapperStyle = useAnimatedStyle(() => {
    const breathScale = interpolate(slime1Breathing.value, [0, 1], [1, 1.04]);
    const idleSquishX = interpolate(slime1Squish.value, [-1, 0, 1], [0.97, 1, 1.03]);
    const idleSquishY = interpolate(slime1Squish.value, [-1, 0, 1], [1.03, 1, 0.97]);

    // STRETCH EFFECT - stress-ball feel
    const currentStretchX = grab1X.value - body1X.value;
    const currentStretchY = grab1Y.value - body1Y.value;
    const stretchMagnitude = Math.sqrt(currentStretchX ** 2 + currentStretchY ** 2);

    // Stretch amount - 15-18% max elongation
    const stretchFactor = interpolate(
      stretchMagnitude,
      [0, 20, 50, 100],
      [1, 1.04, 1.1, 1.18],
      Extrapolation.CLAMP
    );
    const compressFactor = interpolate(
      stretchMagnitude,
      [0, 20, 50, 100],
      [1, 0.98, 0.94, 0.9],
      Extrapolation.CLAMP
    );

    // Calculate stretch direction
    const stretchAngle = Math.atan2(currentStretchY, currentStretchX);
    const cosAngle = Math.abs(Math.cos(stretchAngle));
    const sinAngle = Math.abs(Math.sin(stretchAngle));

    // Directional stretch
    const directionalStretchX = 1 + (stretchFactor - 1) * cosAngle + (compressFactor - 1) * sinAngle;
    const directionalStretchY = 1 + (stretchFactor - 1) * sinAngle + (compressFactor - 1) * cosAngle;

    // SKEW - teardrop shape when pulled
    const maxSkew = 10;
    const skewIntensity = interpolate(
      stretchMagnitude,
      [0, 15, 40, 80],
      [0, 0.2, 0.5, 0.8],
      Extrapolation.CLAMP
    );
    const stretchSkewX = (currentStretchY / 100) * maxSkew * skewIntensity;
    const stretchSkewY = -(currentStretchX / 100) * maxSkew * skewIntensity;

    // Impact deformation
    const impactCompressX = 1 - Math.abs(slime1ImpactX.value) * 0.15;
    const impactCompressY = 1 - Math.abs(slime1ImpactY.value) * 0.15;
    const impactBulgeX = 1 + Math.abs(slime1ImpactY.value) * 0.1;
    const impactBulgeY = 1 + Math.abs(slime1ImpactX.value) * 0.1;
    const impactSkewX = slime1ImpactY.value * 8;
    const impactSkewY = -slime1ImpactX.value * 8;

    // Flight deformation
    const flightScaleX = 1 + Math.abs(slime1FlightX.value) * 1.2;
    const flightScaleY = 1 + Math.abs(slime1FlightY.value) * 1.2;
    const flightCompressX = 1 - Math.abs(slime1FlightY.value) * 0.4;
    const flightCompressY = 1 - Math.abs(slime1FlightX.value) * 0.4;
    const flightSkewX = slime1FlightY.value * 25;
    const flightSkewY = -slime1FlightX.value * 25;

    // Edge squish
    const horizontalSquish = 1 - (slime1EdgeLeft.value + slime1EdgeRight.value) * 0.12;
    const verticalSquish = 1 - (slime1EdgeTop.value + slime1EdgeBottom.value) * 0.12;
    const horizontalBulge = 1 + (slime1EdgeTop.value + slime1EdgeBottom.value) * 0.08;
    const verticalBulge = 1 + (slime1EdgeLeft.value + slime1EdgeRight.value) * 0.08;

    // Press squish
    const pressCompressY = 1 - press1Squish.value * 0.15;
    const pressBulgeX = 1 + press1Squish.value * 0.08;

    // Total skew
    const totalSkewX = stretchSkewX + wobble1SkewX.value + flightSkewX + impactSkewX;
    const totalSkewY = stretchSkewY + wobble1SkewY.value + flightSkewY + impactSkewY;

    // Combined scales
    const scaleX = breathScale * idleSquishX * directionalStretchX * wobble1Scale.value * impactCompressX * impactBulgeX * flightScaleX * flightCompressX * horizontalSquish * horizontalBulge * pressBulgeX;
    const scaleY = breathScale * idleSquishY * directionalStretchY * wobble1Scale.value * impactCompressY * impactBulgeY * flightScaleY * flightCompressY * verticalSquish * verticalBulge * pressCompressY;

    return {
      transform: [
        { translateX: body1X.value + wobble1X.value },
        { translateY: body1Y.value + wobble1Y.value },
        { skewX: `${totalSkewX}deg` },
        { skewY: `${totalSkewY}deg` },
        { scaleX },
        { scaleY },
      ],
    };
  });

  // Slime 1 body style - handles border radius only
  const slime1BodyStyle = useAnimatedStyle(() => {
    const variants = MORPH_VARIANTS['fitness_coach'];

    // Morph border radius
    const p = slime1Morph.value;
    let tl, tr, br, bl;
    if (p <= 1) {
      tl = interpolate(p, [0, 1], [variants[0].tl, variants[1].tl]);
      tr = interpolate(p, [0, 1], [variants[0].tr, variants[1].tr]);
      br = interpolate(p, [0, 1], [variants[0].br, variants[1].br]);
      bl = interpolate(p, [0, 1], [variants[0].bl, variants[1].bl]);
    } else {
      tl = interpolate(p, [1, 2], [variants[1].tl, variants[2].tl]);
      tr = interpolate(p, [1, 2], [variants[1].tr, variants[2].tr]);
      br = interpolate(p, [1, 2], [variants[1].br, variants[2].br]);
      bl = interpolate(p, [1, 2], [variants[1].bl, variants[2].bl]);
    }

    // Edge collision flattens border radius
    if (slime1EdgeLeft.value > 0.1) {
      tl = interpolate(slime1EdgeLeft.value, [0, 1], [tl, 8]);
      bl = interpolate(slime1EdgeLeft.value, [0, 1], [bl, 8]);
    }
    if (slime1EdgeRight.value > 0.1) {
      tr = interpolate(slime1EdgeRight.value, [0, 1], [tr, 8]);
      br = interpolate(slime1EdgeRight.value, [0, 1], [br, 8]);
    }
    if (slime1EdgeTop.value > 0.1) {
      tl = interpolate(slime1EdgeTop.value, [0, 1], [tl, 8]);
      tr = interpolate(slime1EdgeTop.value, [0, 1], [tr, 8]);
    }
    if (slime1EdgeBottom.value > 0.1) {
      bl = interpolate(slime1EdgeBottom.value, [0, 1], [bl, 8]);
      br = interpolate(slime1EdgeBottom.value, [0, 1], [br, 8]);
    }

    const minDim = Math.min(SLIME_WIDTH, SLIME_HEIGHT);

    return {
      borderTopLeftRadius: (tl / 100) * minDim,
      borderTopRightRadius: (tr / 100) * minDim,
      borderBottomRightRadius: (br / 100) * minDim,
      borderBottomLeftRadius: (bl / 100) * minDim,
    };
  });

  // Slime 2 wrapper style - handles all transforms (position, scale, skew)
  const slime2WrapperStyle = useAnimatedStyle(() => {
    const breathScale = interpolate(slime2Breathing.value, [0, 1], [1, 1.04]);
    const idleSquishX = interpolate(slime2Squish.value, [-1, 0, 1], [0.97, 1, 1.03]);
    const idleSquishY = interpolate(slime2Squish.value, [-1, 0, 1], [1.03, 1, 0.97]);

    // STRETCH EFFECT - stress-ball feel
    const currentStretchX = grab2X.value - body2X.value;
    const currentStretchY = grab2Y.value - body2Y.value;
    const stretchMagnitude = Math.sqrt(currentStretchX ** 2 + currentStretchY ** 2);

    // Stretch amount
    const stretchFactor = interpolate(
      stretchMagnitude,
      [0, 20, 50, 100],
      [1, 1.04, 1.1, 1.18],
      Extrapolation.CLAMP
    );
    const compressFactor = interpolate(
      stretchMagnitude,
      [0, 20, 50, 100],
      [1, 0.98, 0.94, 0.9],
      Extrapolation.CLAMP
    );

    // Calculate stretch direction
    const stretchAngle = Math.atan2(currentStretchY, currentStretchX);
    const cosAngle = Math.abs(Math.cos(stretchAngle));
    const sinAngle = Math.abs(Math.sin(stretchAngle));

    // Directional stretch
    const directionalStretchX = 1 + (stretchFactor - 1) * cosAngle + (compressFactor - 1) * sinAngle;
    const directionalStretchY = 1 + (stretchFactor - 1) * sinAngle + (compressFactor - 1) * cosAngle;

    // SKEW - teardrop shape when pulled
    const maxSkew = 10;
    const skewIntensity = interpolate(
      stretchMagnitude,
      [0, 15, 40, 80],
      [0, 0.2, 0.5, 0.8],
      Extrapolation.CLAMP
    );
    const stretchSkewX = (currentStretchY / 100) * maxSkew * skewIntensity;
    const stretchSkewY = -(currentStretchX / 100) * maxSkew * skewIntensity;

    // Impact deformation
    const impactCompressX = 1 - Math.abs(slime2ImpactX.value) * 0.15;
    const impactCompressY = 1 - Math.abs(slime2ImpactY.value) * 0.15;
    const impactBulgeX = 1 + Math.abs(slime2ImpactY.value) * 0.1;
    const impactBulgeY = 1 + Math.abs(slime2ImpactX.value) * 0.1;
    const impactSkewX = slime2ImpactY.value * 8;
    const impactSkewY = -slime2ImpactX.value * 8;

    // Flight deformation
    const flightScaleX = 1 + Math.abs(slime2FlightX.value) * 1.2;
    const flightScaleY = 1 + Math.abs(slime2FlightY.value) * 1.2;
    const flightCompressX = 1 - Math.abs(slime2FlightY.value) * 0.4;
    const flightCompressY = 1 - Math.abs(slime2FlightX.value) * 0.4;
    const flightSkewX = slime2FlightY.value * 25;
    const flightSkewY = -slime2FlightX.value * 25;

    // Edge squish
    const horizontalSquish = 1 - (slime2EdgeLeft.value + slime2EdgeRight.value) * 0.12;
    const verticalSquish = 1 - (slime2EdgeTop.value + slime2EdgeBottom.value) * 0.12;
    const horizontalBulge = 1 + (slime2EdgeTop.value + slime2EdgeBottom.value) * 0.08;
    const verticalBulge = 1 + (slime2EdgeLeft.value + slime2EdgeRight.value) * 0.08;

    // Press squish
    const pressCompressY = 1 - press2Squish.value * 0.15;
    const pressBulgeX = 1 + press2Squish.value * 0.08;

    // Total skew
    const totalSkewX = stretchSkewX + wobble2SkewX.value + flightSkewX + impactSkewX;
    const totalSkewY = stretchSkewY + wobble2SkewY.value + flightSkewY + impactSkewY;

    // Combined scales
    const scaleX = breathScale * idleSquishX * directionalStretchX * wobble2Scale.value * impactCompressX * impactBulgeX * flightScaleX * flightCompressX * horizontalSquish * horizontalBulge * pressBulgeX;
    const scaleY = breathScale * idleSquishY * directionalStretchY * wobble2Scale.value * impactCompressY * impactBulgeY * flightScaleY * flightCompressY * verticalSquish * verticalBulge * pressCompressY;

    return {
      transform: [
        { translateX: body2X.value + wobble2X.value },
        { translateY: body2Y.value + wobble2Y.value },
        { skewX: `${totalSkewX}deg` },
        { skewY: `${totalSkewY}deg` },
        { scaleX },
        { scaleY },
      ],
    };
  });

  // Slime 2 body style - handles border radius only
  const slime2BodyStyle = useAnimatedStyle(() => {
    const variants = MORPH_VARIANTS['finance'];

    // Morph border radius
    const p = slime2Morph.value;
    let tl, tr, br, bl;
    if (p <= 1) {
      tl = interpolate(p, [0, 1], [variants[0].tl, variants[1].tl]);
      tr = interpolate(p, [0, 1], [variants[0].tr, variants[1].tr]);
      br = interpolate(p, [0, 1], [variants[0].br, variants[1].br]);
      bl = interpolate(p, [0, 1], [variants[0].bl, variants[1].bl]);
    } else {
      tl = interpolate(p, [1, 2], [variants[1].tl, variants[2].tl]);
      tr = interpolate(p, [1, 2], [variants[1].tr, variants[2].tr]);
      br = interpolate(p, [1, 2], [variants[1].br, variants[2].br]);
      bl = interpolate(p, [1, 2], [variants[1].bl, variants[2].bl]);
    }

    // Edge collision flattens border radius
    if (slime2EdgeLeft.value > 0.1) {
      tl = interpolate(slime2EdgeLeft.value, [0, 1], [tl, 8]);
      bl = interpolate(slime2EdgeLeft.value, [0, 1], [bl, 8]);
    }
    if (slime2EdgeRight.value > 0.1) {
      tr = interpolate(slime2EdgeRight.value, [0, 1], [tr, 8]);
      br = interpolate(slime2EdgeRight.value, [0, 1], [br, 8]);
    }
    if (slime2EdgeTop.value > 0.1) {
      tl = interpolate(slime2EdgeTop.value, [0, 1], [tl, 8]);
      tr = interpolate(slime2EdgeTop.value, [0, 1], [tr, 8]);
    }
    if (slime2EdgeBottom.value > 0.1) {
      bl = interpolate(slime2EdgeBottom.value, [0, 1], [bl, 8]);
      br = interpolate(slime2EdgeBottom.value, [0, 1], [br, 8]);
    }

    const minDim = Math.min(SLIME_WIDTH, SLIME_HEIGHT);

    return {
      borderTopLeftRadius: (tl / 100) * minDim,
      borderTopRightRadius: (tr / 100) * minDim,
      borderBottomRightRadius: (br / 100) * minDim,
      borderBottomLeftRadius: (bl / 100) * minDim,
    };
  });

  // Eye blink styles
  const eye1Style = useAnimatedStyle(() => {
    const scaleY = interpolate(slime1Blink.value, [0, 1], [1, 0.1]);
    return { transform: [{ scaleY }] };
  });

  const eye2Style = useAnimatedStyle(() => {
    const scaleY = interpolate(slime2Blink.value, [0, 1], [1, 0.1]);
    return { transform: [{ scaleY }] };
  });

  // Name badge styles - attached to slime body (moves with all transforms)
  // These just track position, the badge is rendered inside the wrapper
  const name1Style = useAnimatedStyle(() => {
    // Face follows body with subtle offset toward grab point
    const faceOffsetX = (grab1X.value - body1X.value) * 0.08;
    const faceOffsetY = (grab1Y.value - body1Y.value) * 0.08;
    return {
      transform: [
        { translateX: faceOffsetX },
        { translateY: faceOffsetY },
      ],
    };
  });

  const name2Style = useAnimatedStyle(() => {
    const faceOffsetX = (grab2X.value - body2X.value) * 0.08;
    const faceOffsetY = (grab2Y.value - body2Y.value) * 0.08;
    return {
      transform: [
        { translateX: faceOffsetX },
        { translateY: faceOffsetY },
      ],
    };
  });

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {/* Slime 1 (Fitness) */}
      <GestureDetector gesture={panGesture1}>
        <Animated.View style={[styles.slimeWrapper, slime1WrapperStyle]}>
          {/* Slime body - colored shape with animated border radius */}
          <Animated.View
            style={[
              styles.slimeBody,
              { backgroundColor: getSlimeColor(fitnessColor) },
              slime1BodyStyle,
            ]}
          />
          {/* Face - inherits all transforms from wrapper */}
          <Animated.View style={[styles.faceContainer, name1Style]}>
            <View style={styles.eyesContainer}>
              <Animated.View style={[styles.eye, eye1Style]} />
              <Animated.View style={[styles.eye, eye1Style]} />
            </View>
            <View style={styles.mouth} />
          </Animated.View>
          {/* Name badge - attached to slime body */}
          <View
            style={[
              styles.nameBadge,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.textMuted,
              }
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.nameBadgeText, { color: themeColors.text }]}>{fitnessName}</Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Slime 2 (Finance) - with glasses */}
      <GestureDetector gesture={panGesture2}>
        <Animated.View style={[styles.slimeWrapper, slime2WrapperStyle]}>
          {/* Slime body - colored shape with animated border radius */}
          <Animated.View
            style={[
              styles.slimeBody,
              { backgroundColor: getSlimeColor(financeColor) },
              slime2BodyStyle,
            ]}
          />
          {/* Face with glasses - inherits all transforms from wrapper */}
          <Animated.View style={[styles.faceContainer, name2Style]}>
            <View style={styles.glassesContainer}>
              <View style={styles.lens}>
                <Animated.View style={[styles.glassPupil, eye2Style]} />
              </View>
              <View style={styles.bridge} />
              <View style={styles.lens}>
                <Animated.View style={[styles.glassPupil, eye2Style]} />
              </View>
            </View>
          </Animated.View>
          {/* Name badge - attached to slime body */}
          <View
            style={[
              styles.nameBadge,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.textMuted,
              }
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.nameBadgeText, { color: themeColors.text }]}>{financeName}</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slimeWrapper: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    // Center the wrapper origin
    marginLeft: -SLIME_WIDTH / 2,
    marginTop: -SLIME_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slimeBody: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  faceContainer: {
    // Not absolute - centered by wrapper's flexbox
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  eye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  mouth: {
    width: 12,
    height: 4,
    backgroundColor: 'transparent',
    borderColor: 'rgba(26, 26, 26, 0.5)',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  // Glasses for finance slime
  glassesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lens: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3d3d3d',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bridge: {
    width: 8,
    height: 4,
    backgroundColor: '#3d3d3d',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  glassPupil: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  // Name badge - attached to slime body
  nameBadge: {
    position: 'absolute',
    bottom: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    // backgroundColor and borderColor are set dynamically via themeColors
  },
  nameBadgeText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
});
