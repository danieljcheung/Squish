import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { Agent } from '@/types';
import { SlimeColor, SlimeType } from './Slime';

// Slime dimensions (75% of home screen 140x112)
const SLIME_WIDTH = 105;
const SLIME_HEIGHT = 84;

// Physics constants (same as InteractiveSlime)
const RETURN_SPRING = { damping: 6, stiffness: 12, mass: 1.5 };
const BODY_SPRING = { damping: 12, stiffness: 80, mass: 0.8 };
const WOBBLE_SPRING = { damping: 6, stiffness: 90, mass: 0.6 };
const JELLY_SPRING = { damping: 8, stiffness: 50, mass: 0.9 };
const FRICTION = 0.992;
const BOUNCE_DAMPING = 0.32;
const MIN_VELOCITY = 20;
const FLICK_VELOCITY_SCALE = 0.75;
const IMPACT_SQUISH_DURATION = 120;
const IMPACT_RECOVERY_DURATION = 320;

// Collision threshold (distance at which slimes bounce)
const COLLISION_THRESHOLD = 80;

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
  const slime1X = useSharedValue(homeX1);
  const slime1Y = useSharedValue(homeY);
  const slime1VelX = useSharedValue(0);
  const slime1VelY = useSharedValue(0);
  const slime1IsDragging = useSharedValue(false);
  const slime1IsFlicking = useSharedValue(false);
  const slime1LastInteraction = useSharedValue(Date.now());
  const slime1WobbleScale = useSharedValue(1);
  const slime1ImpactX = useSharedValue(0);
  const slime1ImpactY = useSharedValue(0);
  const slime1FlightX = useSharedValue(0);
  const slime1FlightY = useSharedValue(0);
  const slime1EdgeLeft = useSharedValue(0);
  const slime1EdgeRight = useSharedValue(0);
  const slime1EdgeTop = useSharedValue(0);
  const slime1EdgeBottom = useSharedValue(0);

  // Idle animations
  const slime1Breathing = useSharedValue(0);
  const slime1Morph = useSharedValue(0);
  const slime1Squish = useSharedValue(0);
  const slime1Blink = useSharedValue(0);

  // ============================================
  // SLIME 2 (FINANCE) STATE
  // ============================================
  const slime2X = useSharedValue(homeX2);
  const slime2Y = useSharedValue(homeY);
  const slime2VelX = useSharedValue(0);
  const slime2VelY = useSharedValue(0);
  const slime2IsDragging = useSharedValue(false);
  const slime2IsFlicking = useSharedValue(false);
  const slime2LastInteraction = useSharedValue(Date.now());
  const slime2WobbleScale = useSharedValue(1);
  const slime2ImpactX = useSharedValue(0);
  const slime2ImpactY = useSharedValue(0);
  const slime2FlightX = useSharedValue(0);
  const slime2FlightY = useSharedValue(0);
  const slime2EdgeLeft = useSharedValue(0);
  const slime2EdgeRight = useSharedValue(0);
  const slime2EdgeTop = useSharedValue(0);
  const slime2EdgeBottom = useSharedValue(0);

  // Idle animations
  const slime2Breathing = useSharedValue(0);
  const slime2Morph = useSharedValue(0);
  const slime2Squish = useSharedValue(0);
  const slime2Blink = useSharedValue(0);

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

      // Slime 1
      if (!slime1IsDragging.value && !slime1IsFlicking.value && now - slime1LastInteraction.value > 2500) {
        slime1X.value = withSpring(homeX1, RETURN_SPRING);
        slime1Y.value = withSpring(homeY, RETURN_SPRING);
      }

      // Slime 2
      if (!slime2IsDragging.value && !slime2IsFlicking.value && now - slime2LastInteraction.value > 2500) {
        slime2X.value = withSpring(homeX2, RETURN_SPRING);
        slime2Y.value = withSpring(homeY, RETURN_SPRING);
      }
    }, 500);

    return () => clearInterval(checkReturn);
  }, [homeX1, homeX2]);

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
      } else {
        let newX = slime1X.value + slime1VelX.value * dt;
        let newY = slime1Y.value + slime1VelY.value * dt;

        // Wall bounces
        if (newX <= bounds.minX) {
          newX = bounds.minX;
          slime1VelX.value = -slime1VelX.value * BOUNCE_DAMPING;
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
          slime1ImpactY.value = withSequence(
            withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime1EdgeBottom.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        }

        slime1X.value = newX;
        slime1Y.value = newY;
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
      } else {
        let newX = slime2X.value + slime2VelX.value * dt;
        let newY = slime2Y.value + slime2VelY.value * dt;

        // Wall bounces
        if (newX <= bounds.minX) {
          newX = bounds.minX;
          slime2VelX.value = -slime2VelX.value * BOUNCE_DAMPING;
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
          slime2ImpactY.value = withSequence(
            withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
          );
          slime2EdgeBottom.value = withSequence(
            withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
            withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
          );
        }

        slime2X.value = newX;
        slime2Y.value = newY;
      }
    }

    // ============================================
    // COLLISION DETECTION BETWEEN SLIMES
    // ============================================
    const dx = slime2X.value - slime1X.value;
    const dy = slime2Y.value - slime1Y.value;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < COLLISION_THRESHOLD && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = COLLISION_THRESHOLD - dist;

      // Push apart
      if (!slime1IsDragging.value) {
        slime1X.value -= nx * overlap * 0.5;
        slime1Y.value -= ny * overlap * 0.5;
      }
      if (!slime2IsDragging.value) {
        slime2X.value += nx * overlap * 0.5;
        slime2Y.value += ny * overlap * 0.5;
      }

      // Calculate relative velocity
      const relVelX = slime2VelX.value - slime1VelX.value;
      const relVelY = slime2VelY.value - slime1VelY.value;
      const relVelDot = relVelX * nx + relVelY * ny;

      // Only respond if slimes are approaching
      if (relVelDot < 0) {
        const impulse = relVelDot * (1 + BOUNCE_DAMPING);

        if (!slime1IsDragging.value) {
          slime1VelX.value += impulse * nx * 0.5;
          slime1VelY.value += impulse * ny * 0.5;
          slime1IsFlicking.value = true;
        }
        if (!slime2IsDragging.value) {
          slime2VelX.value -= impulse * nx * 0.5;
          slime2VelY.value -= impulse * ny * 0.5;
          slime2IsFlicking.value = true;
        }

        // Impact squish on collision
        const impactIntensity = Math.min(1, Math.abs(relVelDot) / 300);
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

        // Wobble on collision
        const collisionSpeed = Math.abs(relVelDot);
        slime1WobbleScale.value = withSequence(
          withTiming(1 - Math.min(0.12, collisionSpeed / 600), { duration: 60 }),
          withTiming(1 + Math.min(0.04, collisionSpeed / 2000), { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
        slime2WobbleScale.value = withSequence(
          withTiming(1 - Math.min(0.12, collisionSpeed / 600), { duration: 60 }),
          withTiming(1 + Math.min(0.04, collisionSpeed / 2000), { duration: 150, easing: Easing.out(Easing.quad) }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      }
    }
  });

  // ============================================
  // GESTURE HANDLERS
  // ============================================

  const panGesture1 = Gesture.Pan()
    .onStart(() => {
      slime1IsDragging.value = true;
      slime1IsFlicking.value = false;
      slime1VelX.value = 0;
      slime1VelY.value = 0;
      slime1FlightX.value = 0;
      slime1FlightY.value = 0;

      cancelAnimation(slime1X);
      cancelAnimation(slime1Y);

      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }
    })
    .onUpdate((event) => {
      const newX = Math.max(bounds.minX, Math.min(bounds.maxX, homeX1 + event.translationX));
      const newY = Math.max(bounds.minY, Math.min(bounds.maxY, event.translationY));
      slime1X.value = newX;
      slime1Y.value = newY;
      slime1LastInteraction.value = Date.now();
    })
    .onEnd((event) => {
      slime1IsDragging.value = false;

      const flickSpeed = Math.sqrt(event.velocityX ** 2 + event.velocityY ** 2);
      const FLICK_THRESHOLD = 300;

      if (flickSpeed > FLICK_THRESHOLD) {
        slime1IsFlicking.value = true;
        slime1VelX.value = event.velocityX * FLICK_VELOCITY_SCALE;
        slime1VelY.value = event.velocityY * FLICK_VELOCITY_SCALE;
      }

      slime1LastInteraction.value = Date.now();

      if (onGestureEnd) {
        runOnJS(onGestureEnd)();
      }
    });

  const panGesture2 = Gesture.Pan()
    .onStart(() => {
      slime2IsDragging.value = true;
      slime2IsFlicking.value = false;
      slime2VelX.value = 0;
      slime2VelY.value = 0;
      slime2FlightX.value = 0;
      slime2FlightY.value = 0;

      cancelAnimation(slime2X);
      cancelAnimation(slime2Y);

      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }
    })
    .onUpdate((event) => {
      const newX = Math.max(bounds.minX, Math.min(bounds.maxX, homeX2 + event.translationX));
      const newY = Math.max(bounds.minY, Math.min(bounds.maxY, event.translationY));
      slime2X.value = newX;
      slime2Y.value = newY;
      slime2LastInteraction.value = Date.now();
    })
    .onEnd((event) => {
      slime2IsDragging.value = false;

      const flickSpeed = Math.sqrt(event.velocityX ** 2 + event.velocityY ** 2);
      const FLICK_THRESHOLD = 300;

      if (flickSpeed > FLICK_THRESHOLD) {
        slime2IsFlicking.value = true;
        slime2VelX.value = event.velocityX * FLICK_VELOCITY_SCALE;
        slime2VelY.value = event.velocityY * FLICK_VELOCITY_SCALE;
      }

      slime2LastInteraction.value = Date.now();

      if (onGestureEnd) {
        runOnJS(onGestureEnd)();
      }
    });

  // ============================================
  // ANIMATED STYLES
  // ============================================

  const slime1Style = useAnimatedStyle(() => {
    const variants = MORPH_VARIANTS['fitness_coach'];
    const breathScale = interpolate(slime1Breathing.value, [0, 1], [1, 1.04]);
    const idleSquishX = interpolate(slime1Squish.value, [-1, 0, 1], [0.97, 1, 1.03]);
    const idleSquishY = interpolate(slime1Squish.value, [-1, 0, 1], [1.03, 1, 0.97]);

    // Impact deformation
    const impactCompressX = 1 - Math.abs(slime1ImpactX.value) * 0.15;
    const impactCompressY = 1 - Math.abs(slime1ImpactY.value) * 0.15;
    const impactBulgeX = 1 + Math.abs(slime1ImpactY.value) * 0.1;
    const impactBulgeY = 1 + Math.abs(slime1ImpactX.value) * 0.1;

    // Flight deformation
    const flightScaleX = 1 + Math.abs(slime1FlightX.value) * 1.2;
    const flightScaleY = 1 + Math.abs(slime1FlightY.value) * 1.2;
    const flightCompressX = 1 - Math.abs(slime1FlightY.value) * 0.4;
    const flightCompressY = 1 - Math.abs(slime1FlightX.value) * 0.4;

    // Edge squish
    const horizontalSquish = 1 - (slime1EdgeLeft.value + slime1EdgeRight.value) * 0.12;
    const verticalSquish = 1 - (slime1EdgeTop.value + slime1EdgeBottom.value) * 0.12;

    const scaleX = breathScale * idleSquishX * slime1WobbleScale.value * impactCompressX * impactBulgeX * flightScaleX * flightCompressX * horizontalSquish;
    const scaleY = breathScale * idleSquishY * slime1WobbleScale.value * impactCompressY * impactBulgeY * flightScaleY * flightCompressY * verticalSquish;

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

    // Flight skew
    const flightSkewX = slime1FlightY.value * 25;
    const flightSkewY = -slime1FlightX.value * 25;

    return {
      transform: [
        { translateX: slime1X.value },
        { translateY: slime1Y.value },
        { skewX: `${flightSkewX}deg` },
        { skewY: `${flightSkewY}deg` },
        { scaleX },
        { scaleY },
      ],
      borderTopLeftRadius: (tl / 100) * minDim,
      borderTopRightRadius: (tr / 100) * minDim,
      borderBottomRightRadius: (br / 100) * minDim,
      borderBottomLeftRadius: (bl / 100) * minDim,
    };
  });

  const slime2Style = useAnimatedStyle(() => {
    const variants = MORPH_VARIANTS['finance'];
    const breathScale = interpolate(slime2Breathing.value, [0, 1], [1, 1.04]);
    const idleSquishX = interpolate(slime2Squish.value, [-1, 0, 1], [0.97, 1, 1.03]);
    const idleSquishY = interpolate(slime2Squish.value, [-1, 0, 1], [1.03, 1, 0.97]);

    // Impact deformation
    const impactCompressX = 1 - Math.abs(slime2ImpactX.value) * 0.15;
    const impactCompressY = 1 - Math.abs(slime2ImpactY.value) * 0.15;
    const impactBulgeX = 1 + Math.abs(slime2ImpactY.value) * 0.1;
    const impactBulgeY = 1 + Math.abs(slime2ImpactX.value) * 0.1;

    // Flight deformation
    const flightScaleX = 1 + Math.abs(slime2FlightX.value) * 1.2;
    const flightScaleY = 1 + Math.abs(slime2FlightY.value) * 1.2;
    const flightCompressX = 1 - Math.abs(slime2FlightY.value) * 0.4;
    const flightCompressY = 1 - Math.abs(slime2FlightX.value) * 0.4;

    // Edge squish
    const horizontalSquish = 1 - (slime2EdgeLeft.value + slime2EdgeRight.value) * 0.12;
    const verticalSquish = 1 - (slime2EdgeTop.value + slime2EdgeBottom.value) * 0.12;

    const scaleX = breathScale * idleSquishX * slime2WobbleScale.value * impactCompressX * impactBulgeX * flightScaleX * flightCompressX * horizontalSquish;
    const scaleY = breathScale * idleSquishY * slime2WobbleScale.value * impactCompressY * impactBulgeY * flightScaleY * flightCompressY * verticalSquish;

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

    // Flight skew
    const flightSkewX = slime2FlightY.value * 25;
    const flightSkewY = -slime2FlightX.value * 25;

    return {
      transform: [
        { translateX: slime2X.value },
        { translateY: slime2Y.value },
        { skewX: `${flightSkewX}deg` },
        { skewY: `${flightSkewY}deg` },
        { scaleX },
        { scaleY },
      ],
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

  // Name label positions (follow slimes)
  const name1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: slime1X.value },
      { translateY: slime1Y.value + SLIME_HEIGHT / 2 + 8 },
    ],
  }));

  const name2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: slime2X.value },
      { translateY: slime2Y.value + SLIME_HEIGHT / 2 + 8 },
    ],
  }));

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]}>
      {/* Slime 1 (Fitness) */}
      <GestureDetector gesture={panGesture1}>
        <Animated.View style={[styles.slimeWrapper]}>
          <Animated.View
            style={[
              styles.slimeBody,
              { backgroundColor: getSlimeColor(fitnessColor) },
              slime1Style,
            ]}
          />
          <Animated.View style={[styles.faceContainer, { transform: [{ translateX: slime1X.value }, { translateY: slime1Y.value }] }]}>
            <View style={styles.eyesContainer}>
              <Animated.View style={[styles.eye, eye1Style]} />
              <Animated.View style={[styles.eye, eye1Style]} />
            </View>
            <View style={styles.mouth} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Slime 2 (Finance) - with glasses */}
      <GestureDetector gesture={panGesture2}>
        <Animated.View style={[styles.slimeWrapper]}>
          <Animated.View
            style={[
              styles.slimeBody,
              { backgroundColor: getSlimeColor(financeColor) },
              slime2Style,
            ]}
          />
          <Animated.View style={[styles.faceContainer, { transform: [{ translateX: slime2X.value }, { translateY: slime2Y.value }] }]}>
            {/* Round glasses for finance slime */}
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
        </Animated.View>
      </GestureDetector>

      {/* Name labels */}
      <Animated.View style={[styles.nameLabel, name1Style]} pointerEvents="none">
        <Text style={styles.nameText}>{fitnessName}</Text>
      </Animated.View>
      <Animated.View style={[styles.nameLabel, name2Style]} pointerEvents="none">
        <Text style={styles.nameText}>{financeName}</Text>
      </Animated.View>
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
  },
  slimeBody: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    left: -SLIME_WIDTH / 2,
    top: -SLIME_HEIGHT / 2,
  },
  faceContainer: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    left: -SLIME_WIDTH / 2,
    top: -SLIME_HEIGHT / 2,
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
  // Name labels
  nameLabel: {
    position: 'absolute',
  },
  nameText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: 'rgba(0, 0, 0, 0.5)',
    textAlign: 'center',
  },
});
