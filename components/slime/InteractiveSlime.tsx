import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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

// Slime dimensions
const SLIME_WIDTH = 140;
const SLIME_HEIGHT = 112;

// Stretchy physics - body follows with slight lag (stress ball feel)
const BODY_SPRING = {
  damping: 12,       // Higher = smoother, less oscillation
  stiffness: 80,     // Higher = follows closer (subtle lag)
  mass: 0.8,
};

// Snap-back physics when released
const SNAPBACK_SPRING = {
  damping: 8,        // Medium = gentle snap
  stiffness: 120,    // Medium-high = responsive but not harsh
  mass: 0.7,
};

// Wobble physics for ripple effect
const WOBBLE_SPRING = {
  damping: 6,        // Medium-low = a few satisfying wobbles
  stiffness: 90,     // Medium = responsive but not snappy
  mass: 0.6,
};

// Return to center physics
const RETURN_SPRING = {
  damping: 6,
  stiffness: 12,
  mass: 1.5,
};

// Jelly physics for edge collision and settling
const JELLY_SPRING = {
  damping: 8,
  stiffness: 50,
  mass: 0.9,
};

// Flick/momentum physics
const FRICTION = 0.985;           // Velocity multiplier per frame (0.98 = medium friction)
const BOUNCE_DAMPING = 0.55;      // Velocity retained after bounce (0.55 = gooey, loses energy)
const MIN_VELOCITY = 15;          // Stop physics below this velocity
const FLICK_VELOCITY_SCALE = 0.8; // Scale down raw velocity for more control
const IMPACT_SQUISH_DURATION = 80; // ms for wall squish animation
const IMPACT_RECOVERY_DURATION = 200; // ms to recover from wall squish

interface InteractiveSlimeProps {
  containerWidth: number;
  containerHeight: number;
}

export default function InteractiveSlime({
  containerWidth,
  containerHeight,
}: InteractiveSlimeProps) {
  // GRAB POINT - where finger is pulling (follows finger directly)
  const grabX = useSharedValue(0);
  const grabY = useSharedValue(0);

  // BODY CENTER - the main slime body (lags behind grab point)
  const bodyX = useSharedValue(0);
  const bodyY = useSharedValue(0);

  // Stretch amount (distance between grab and body)
  const stretchX = useSharedValue(0);
  const stretchY = useSharedValue(0);

  // Wobble for snap-back ripple
  const wobbleX = useSharedValue(0);
  const wobbleY = useSharedValue(0);
  const wobbleScale = useSharedValue(1);
  const wobbleSkewX = useSharedValue(0);
  const wobbleSkewY = useSharedValue(0);

  // Interaction state
  const isDragging = useSharedValue(false);
  const lastInteractionTime = useSharedValue(Date.now());

  // Flick/momentum physics state
  const velocityX = useSharedValue(0);
  const velocityY = useSharedValue(0);
  const isFlicking = useSharedValue(false);

  // Flight deformation (stretch in direction of movement)
  const flightStretchX = useSharedValue(0);
  const flightStretchY = useSharedValue(0);

  // Impact squish (compress against wall)
  const impactSquishX = useSharedValue(0); // -1 = left wall, +1 = right wall
  const impactSquishY = useSharedValue(0); // -1 = top wall, +1 = bottom wall

  // Idle animations
  const breathingProgress = useSharedValue(0);
  const morphProgress1 = useSharedValue(0);
  const morphProgress2 = useSharedValue(0);
  const squishProgress = useSharedValue(0);
  const blinkProgress = useSharedValue(0);

  // Edge collision state
  const edgeLeft = useSharedValue(0);
  const edgeRight = useSharedValue(0);
  const edgeTop = useSharedValue(0);
  const edgeBottom = useSharedValue(0);

  // Calculate bounds
  const padding = 4;
  const bounds = {
    minX: -(containerWidth / 2 - SLIME_WIDTH / 2 - padding),
    maxX: containerWidth / 2 - SLIME_WIDTH / 2 - padding,
    minY: -(containerHeight / 2 - SLIME_HEIGHT / 2 - padding),
    maxY: containerHeight / 2 - SLIME_HEIGHT / 2 - padding,
  };

  // Start idle animations
  useEffect(() => {
    breathingProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    morphProgress1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    morphProgress2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    squishProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    const blinkInterval = setInterval(() => {
      if (!isDragging.value) {
        blinkProgress.value = withSequence(
          withTiming(1, { duration: 80 }),
          withDelay(50, withTiming(0, { duration: 80 }))
        );
      }
    }, 3500 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Return to home position after inactivity
  useEffect(() => {
    const checkReturn = setInterval(() => {
      const timeSinceInteraction = Date.now() - lastInteractionTime.value;
      if (!isDragging.value && !isFlicking.value && timeSinceInteraction > 2500) {
        // Return to home position (centered)
        grabX.value = withSpring(0, RETURN_SPRING);
        grabY.value = withSpring(0, RETURN_SPRING);
        bodyX.value = withSpring(0, RETURN_SPRING);
        bodyY.value = withSpring(0, RETURN_SPRING);
      }
    }, 500);

    return () => clearInterval(checkReturn);
  }, []);

  // Physics simulation for flick momentum and bouncing
  useFrameCallback(() => {
    'worklet';
    if (!isFlicking.value || isDragging.value) return;

    // Apply friction
    velocityX.value *= FRICTION;
    velocityY.value *= FRICTION;

    // Calculate velocity magnitude
    const speed = Math.sqrt(velocityX.value ** 2 + velocityY.value ** 2);

    // Update flight deformation based on velocity (stretch in movement direction)
    const maxFlightStretch = 0.15; // Max 15% stretch during flight
    const stretchIntensity = Math.min(1, speed / 800);
    if (speed > MIN_VELOCITY * 2) {
      // Normalize velocity direction
      const dirX = velocityX.value / speed;
      const dirY = velocityY.value / speed;
      flightStretchX.value = dirX * stretchIntensity * maxFlightStretch;
      flightStretchY.value = dirY * stretchIntensity * maxFlightStretch;
    } else {
      // Ease out flight stretch when slowing down
      flightStretchX.value *= 0.9;
      flightStretchY.value *= 0.9;
    }

    // Stop physics if velocity is too low
    if (speed < MIN_VELOCITY) {
      isFlicking.value = false;
      velocityX.value = 0;
      velocityY.value = 0;
      flightStretchX.value = 0;
      flightStretchY.value = 0;

      // Settle with gentle spring
      bodyX.value = withSpring(bodyX.value, JELLY_SPRING);
      bodyY.value = withSpring(bodyY.value, JELLY_SPRING);
      grabX.value = withSpring(bodyX.value, JELLY_SPRING);
      grabY.value = withSpring(bodyY.value, JELLY_SPRING);
      return;
    }

    // Apply velocity to position (convert from px/s to px/frame at ~60fps)
    const dt = 1 / 60;
    let newX = bodyX.value + velocityX.value * dt;
    let newY = bodyY.value + velocityY.value * dt;

    // Check for wall collisions and bounce
    let bounced = false;

    // Left wall
    if (newX <= bounds.minX) {
      newX = bounds.minX;
      velocityX.value = -velocityX.value * BOUNCE_DAMPING;
      bounced = true;
      // Trigger impact squish (compress horizontally, bulge vertically)
      impactSquishX.value = -1;
      impactSquishX.value = withSequence(
        withTiming(-0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.back(1.5)) })
      );
      // Edge collision visual
      edgeLeft.value = withSequence(
        withTiming(0.6, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
      );
    }

    // Right wall
    if (newX >= bounds.maxX) {
      newX = bounds.maxX;
      velocityX.value = -velocityX.value * BOUNCE_DAMPING;
      bounced = true;
      impactSquishX.value = withSequence(
        withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.back(1.5)) })
      );
      edgeRight.value = withSequence(
        withTiming(0.6, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
      );
    }

    // Top wall
    if (newY <= bounds.minY) {
      newY = bounds.minY;
      velocityY.value = -velocityY.value * BOUNCE_DAMPING;
      bounced = true;
      impactSquishY.value = withSequence(
        withTiming(-0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.back(1.5)) })
      );
      edgeTop.value = withSequence(
        withTiming(0.6, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
      );
    }

    // Bottom wall
    if (newY >= bounds.maxY) {
      newY = bounds.maxY;
      velocityY.value = -velocityY.value * BOUNCE_DAMPING;
      bounced = true;
      impactSquishY.value = withSequence(
        withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.back(1.5)) })
      );
      edgeBottom.value = withSequence(
        withTiming(0.6, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION })
      );
    }

    // Trigger wobble on bounce
    if (bounced) {
      const impactIntensity = Math.min(0.8, speed / 600);
      wobbleScale.value = withSequence(
        withSpring(1 + impactIntensity * 0.08, { damping: 8, stiffness: 200 }),
        withSpring(1 - impactIntensity * 0.04, WOBBLE_SPRING),
        withSpring(1, WOBBLE_SPRING)
      );
    }

    // Update position
    bodyX.value = newX;
    bodyY.value = newY;
    grabX.value = newX;
    grabY.value = newY;
  });

  // Trigger snap-back wobble when released (subtle, stress-ball feel)
  const triggerSnapBackWobble = (dx: number, dy: number, vx: number, vy: number) => {
    'worklet';
    const stretchMagnitude = Math.sqrt(dx * dx + dy * dy);
    const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);

    // Wobble intensity - more subtle scaling
    const wobbleIntensity = Math.min(0.6, stretchMagnitude / 80);
    const velocityIntensity = Math.min(0.6, velocityMagnitude / 2000);
    const intensity = Math.max(wobbleIntensity, velocityIntensity);

    // Position wobble - subtle overshoot
    wobbleX.value = withSequence(
      withSpring(-dx * 0.15, WOBBLE_SPRING),
      withSpring(dx * 0.06, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );

    wobbleY.value = withSequence(
      withSpring(-dy * 0.15, WOBBLE_SPRING),
      withSpring(dy * 0.06, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );

    // Scale wobble - gentle squish and expand
    wobbleScale.value = withSequence(
      withSpring(1 + intensity * 0.06, WOBBLE_SPRING),
      withSpring(1 - intensity * 0.03, WOBBLE_SPRING),
      withSpring(1, WOBBLE_SPRING)
    );

    // Skew wobble - subtle "settle" effect
    const skewAmount = intensity * 6; // degrees (reduced from 15)
    const angle = Math.atan2(dy, dx);

    wobbleSkewX.value = withSequence(
      withSpring(-Math.cos(angle) * skewAmount, WOBBLE_SPRING),
      withSpring(Math.cos(angle) * skewAmount * 0.3, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );

    wobbleSkewY.value = withSequence(
      withSpring(-Math.sin(angle) * skewAmount, WOBBLE_SPRING),
      withSpring(Math.sin(angle) * skewAmount * 0.3, WOBBLE_SPRING),
      withSpring(0, WOBBLE_SPRING)
    );
  };

  // Update edge collision
  const updateEdgeCollision = (x: number, y: number) => {
    'worklet';
    const edgePadding = 8;
    const collisionDepth = 20;

    if (x <= bounds.minX + edgePadding) {
      edgeLeft.value = Math.min(1, (bounds.minX + edgePadding - x) / collisionDepth + 0.3);
    } else {
      edgeLeft.value = withSpring(0, JELLY_SPRING);
    }

    if (x >= bounds.maxX - edgePadding) {
      edgeRight.value = Math.min(1, (x - (bounds.maxX - edgePadding)) / collisionDepth + 0.3);
    } else {
      edgeRight.value = withSpring(0, JELLY_SPRING);
    }

    if (y <= bounds.minY + edgePadding) {
      edgeTop.value = Math.min(1, (bounds.minY + edgePadding - y) / collisionDepth + 0.3);
    } else {
      edgeTop.value = withSpring(0, JELLY_SPRING);
    }

    if (y >= bounds.maxY - edgePadding) {
      edgeBottom.value = Math.min(1, (y - (bounds.maxY - edgePadding)) / collisionDepth + 0.3);
    } else {
      edgeBottom.value = withSpring(0, JELLY_SPRING);
    }
  };

  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      isFlicking.value = false; // Stop any flick physics

      // Cancel any ongoing animations
      cancelAnimation(grabX);
      cancelAnimation(grabY);
      cancelAnimation(bodyX);
      cancelAnimation(bodyY);
      cancelAnimation(wobbleX);
      cancelAnimation(wobbleY);
      cancelAnimation(wobbleScale);
      cancelAnimation(wobbleSkewX);
      cancelAnimation(wobbleSkewY);
      cancelAnimation(stretchX);
      cancelAnimation(stretchY);
      cancelAnimation(impactSquishX);
      cancelAnimation(impactSquishY);

      // Reset flick-related values
      velocityX.value = 0;
      velocityY.value = 0;
      flightStretchX.value = 0;
      flightStretchY.value = 0;
      impactSquishX.value = 0;
      impactSquishY.value = 0;

      wobbleScale.value = 1;
      wobbleSkewX.value = 0;
      wobbleSkewY.value = 0;
    })
    .onUpdate((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      // Clamp grab point to bounds
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, event.translationX));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, event.translationY));

      // Grab point follows finger IMMEDIATELY (this is where you're "pulling")
      grabX.value = clampedX;
      grabY.value = clampedY;

      // Body follows with SOFT spring - creates the stretchy lag
      bodyX.value = withSpring(clampedX, BODY_SPRING);
      bodyY.value = withSpring(clampedY, BODY_SPRING);

      // Calculate current stretch (difference between grab and body)
      stretchX.value = clampedX - bodyX.value;
      stretchY.value = clampedY - bodyY.value;

      // Update edge collision based on body position
      updateEdgeCollision(bodyX.value, bodyY.value);

      lastInteractionTime.value = Date.now();
    })
    .onEnd((event: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
      isDragging.value = false;

      // Calculate final stretch at release
      const finalStretchX = grabX.value - bodyX.value;
      const finalStretchY = grabY.value - bodyY.value;

      // Check if this is a flick (has enough velocity)
      const flickSpeed = Math.sqrt(event.velocityX ** 2 + event.velocityY ** 2);
      const FLICK_THRESHOLD = 300; // px/s minimum to trigger flick

      if (flickSpeed > FLICK_THRESHOLD) {
        // Start flick physics
        isFlicking.value = true;
        velocityX.value = event.velocityX * FLICK_VELOCITY_SCALE;
        velocityY.value = event.velocityY * FLICK_VELOCITY_SCALE;

        // Sync grab point to body for flicking
        grabX.value = bodyX.value;
        grabY.value = bodyY.value;

        // Clear stretch immediately
        stretchX.value = 0;
        stretchY.value = 0;

        // Initial launch wobble (subtle)
        const launchIntensity = Math.min(0.5, flickSpeed / 1500);
        wobbleScale.value = withSequence(
          withTiming(1 - launchIntensity * 0.05, { duration: 50 }),
          withSpring(1, WOBBLE_SPRING)
        );
      } else {
        // Normal release - settle in place
        // Snap the grab point to where the body is (release the "pull")
        const targetX = bodyX.value;
        const targetY = bodyY.value;

        // Clamp to bounds
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, targetX));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, targetY));

        // Grab point snaps to body with fast spring
        grabX.value = withSpring(clampedX, SNAPBACK_SPRING);
        grabY.value = withSpring(clampedY, SNAPBACK_SPRING);

        // Body settles with jiggly spring (includes velocity for momentum)
        bodyX.value = withSpring(clampedX, {
          ...JELLY_SPRING,
          velocity: event.velocityX * 0.2,
        });
        bodyY.value = withSpring(clampedY, {
          ...JELLY_SPRING,
          velocity: event.velocityY * 0.2,
        });

        // Clear stretch
        stretchX.value = withSpring(0, SNAPBACK_SPRING);
        stretchY.value = withSpring(0, SNAPBACK_SPRING);

        // Trigger the satisfying snap-back wobble
        triggerSnapBackWobble(finalStretchX, finalStretchY, event.velocityX, event.velocityY);
      }

      // Clear edge collision
      edgeLeft.value = withSpring(0, JELLY_SPRING);
      edgeRight.value = withSpring(0, JELLY_SPRING);
      edgeTop.value = withSpring(0, JELLY_SPRING);
      edgeBottom.value = withSpring(0, JELLY_SPRING);

      lastInteractionTime.value = Date.now();
    });

  // Animated styles for the slime body
  const slimeStyle = useAnimatedStyle(() => {
    // Base breathing scale
    const breathScale = interpolate(breathingProgress.value, [0, 1], [1, 1.04]);

    // Idle squish
    const idleSquishX = interpolate(squishProgress.value, [-1, 0, 1], [0.97, 1, 1.03]);
    const idleSquishY = interpolate(squishProgress.value, [-1, 0, 1], [1.03, 1, 0.97]);

    // STRETCH EFFECT - subtle, stress-ball feel
    const currentStretchX = grabX.value - bodyX.value;
    const currentStretchY = grabY.value - bodyY.value;
    const stretchMagnitude = Math.sqrt(currentStretchX ** 2 + currentStretchY ** 2);

    // Stretch amount - subtle 15-18% max elongation
    const stretchFactor = interpolate(
      stretchMagnitude,
      [0, 20, 50, 100],
      [1, 1.04, 1.1, 1.18],
      Extrapolation.CLAMP
    );

    // Compress perpendicular - subtle volume preservation
    const compressFactor = interpolate(
      stretchMagnitude,
      [0, 20, 50, 100],
      [1, 0.98, 0.94, 0.9],
      Extrapolation.CLAMP
    );

    // Calculate stretch direction
    const stretchAngle = Math.atan2(currentStretchY, currentStretchX);

    // Apply directional stretch
    const cosAngle = Math.abs(Math.cos(stretchAngle));
    const sinAngle = Math.abs(Math.sin(stretchAngle));

    // Stretch in drag direction, compress perpendicular
    const directionalStretchX = 1 + (stretchFactor - 1) * cosAngle + (compressFactor - 1) * sinAngle;
    const directionalStretchY = 1 + (stretchFactor - 1) * sinAngle + (compressFactor - 1) * cosAngle;

    // SKEW - subtle teardrop shape when pulled
    const maxSkew = 10; // degrees (reduced from 25)
    const skewIntensity = interpolate(
      stretchMagnitude,
      [0, 15, 40, 80],
      [0, 0.2, 0.5, 0.8],
      Extrapolation.CLAMP
    );

    const skewX = (currentStretchY / 100) * maxSkew * skewIntensity;
    const skewY = -(currentStretchX / 100) * maxSkew * skewIntensity;

    // Edge collision squish - subtle 10-15% compression
    const horizontalSquish = 1 - (edgeLeft.value + edgeRight.value) * 0.12;
    const verticalSquish = 1 - (edgeTop.value + edgeBottom.value) * 0.12;
    const horizontalBulge = 1 + (edgeTop.value + edgeBottom.value) * 0.08;
    const verticalBulge = 1 + (edgeLeft.value + edgeRight.value) * 0.08;

    // Flight deformation - stretch in direction of movement
    // flightStretchX/Y are normalized direction * intensity (0 to ~0.15)
    const flightScaleX = 1 + Math.abs(flightStretchX.value) * 1.2; // Stretch in movement direction
    const flightScaleY = 1 + Math.abs(flightStretchY.value) * 1.2;
    // Compress perpendicular to movement (volume preservation)
    const flightCompressX = 1 - Math.abs(flightStretchY.value) * 0.4;
    const flightCompressY = 1 - Math.abs(flightStretchX.value) * 0.4;

    // Impact squish - compress against wall, bulge perpendicular
    // impactSquishX: negative = left wall, positive = right wall
    // impactSquishY: negative = top wall, positive = bottom wall
    const impactCompressX = 1 - Math.abs(impactSquishX.value) * 0.15;
    const impactCompressY = 1 - Math.abs(impactSquishY.value) * 0.15;
    const impactBulgeX = 1 + Math.abs(impactSquishY.value) * 0.1;
    const impactBulgeY = 1 + Math.abs(impactSquishX.value) * 0.1;

    // Combine all scale effects
    let scaleX = breathScale * idleSquishX * directionalStretchX * horizontalSquish * horizontalBulge * wobbleScale.value * flightScaleX * flightCompressX * impactCompressX * impactBulgeX;
    let scaleY = breathScale * idleSquishY * directionalStretchY * verticalSquish * verticalBulge * wobbleScale.value * flightScaleY * flightCompressY * impactCompressY * impactBulgeY;

    // Organic morph
    const baseVariants = [
      { tl: 42, tr: 58, br: 68, bl: 32 },
      { tl: 48, tr: 52, br: 62, bl: 38 },
      { tl: 38, tr: 62, br: 72, bl: 28 },
    ];

    const p1 = morphProgress1.value;
    let tl, tr, br, bl;
    if (p1 <= 1) {
      tl = interpolate(p1, [0, 1], [baseVariants[0].tl, baseVariants[1].tl]);
      tr = interpolate(p1, [0, 1], [baseVariants[0].tr, baseVariants[1].tr]);
      br = interpolate(p1, [0, 1], [baseVariants[0].br, baseVariants[1].br]);
      bl = interpolate(p1, [0, 1], [baseVariants[0].bl, baseVariants[1].bl]);
    } else {
      tl = interpolate(p1, [1, 2], [baseVariants[1].tl, baseVariants[2].tl]);
      tr = interpolate(p1, [1, 2], [baseVariants[1].tr, baseVariants[2].tr]);
      br = interpolate(p1, [1, 2], [baseVariants[1].br, baseVariants[2].br]);
      bl = interpolate(p1, [1, 2], [baseVariants[1].bl, baseVariants[2].bl]);
    }

    const p2 = morphProgress2.value;
    const morphOffset = interpolate(p2, [0, 1], [-4, 4]);
    tl += morphOffset;
    br += morphOffset;
    tr -= morphOffset * 0.7;
    bl -= morphOffset * 0.7;

    // Edge collision flattens border radius
    if (edgeLeft.value > 0.1) {
      tl = interpolate(edgeLeft.value, [0, 1], [tl, 8]);
      bl = interpolate(edgeLeft.value, [0, 1], [bl, 8]);
    }
    if (edgeRight.value > 0.1) {
      tr = interpolate(edgeRight.value, [0, 1], [tr, 8]);
      br = interpolate(edgeRight.value, [0, 1], [br, 8]);
    }
    if (edgeTop.value > 0.1) {
      tl = interpolate(edgeTop.value, [0, 1], [tl, 8]);
      tr = interpolate(edgeTop.value, [0, 1], [tr, 8]);
    }
    if (edgeBottom.value > 0.1) {
      bl = interpolate(edgeBottom.value, [0, 1], [bl, 8]);
      br = interpolate(edgeBottom.value, [0, 1], [br, 8]);
    }

    // Modify border radius based on stretch direction (subtle teardrop effect)
    const stretchEffect = stretchMagnitude / 150; // More gradual
    if (currentStretchX > 8) {
      // Pulling right - subtle rounding
      tr += stretchEffect * 4;
      br += stretchEffect * 4;
      tl -= stretchEffect * 3;
      bl -= stretchEffect * 3;
    } else if (currentStretchX < -8) {
      // Pulling left
      tl += stretchEffect * 4;
      bl += stretchEffect * 4;
      tr -= stretchEffect * 3;
      br -= stretchEffect * 3;
    }
    if (currentStretchY > 8) {
      // Pulling down
      bl += stretchEffect * 4;
      br += stretchEffect * 4;
      tl -= stretchEffect * 3;
      tr -= stretchEffect * 3;
    } else if (currentStretchY < -8) {
      // Pulling up
      tl += stretchEffect * 4;
      tr += stretchEffect * 4;
      bl -= stretchEffect * 3;
      br -= stretchEffect * 3;
    }

    // Clamp border radius values
    tl = Math.max(5, Math.min(80, tl));
    tr = Math.max(5, Math.min(80, tr));
    br = Math.max(5, Math.min(80, br));
    bl = Math.max(5, Math.min(80, bl));

    const minDim = Math.min(SLIME_WIDTH, SLIME_HEIGHT);

    // Flight skew - tilt in direction of movement (subtle trailing effect)
    const flightSkewX = flightStretchY.value * 25; // Tilt based on vertical movement
    const flightSkewY = -flightStretchX.value * 25; // Tilt based on horizontal movement

    // Impact skew - slight tilt away from wall on impact
    const impactSkewX = impactSquishY.value * 8;
    const impactSkewY = -impactSquishX.value * 8;

    // Total skew including wobble, flight, and impact
    const totalSkewX = skewX + wobbleSkewX.value + flightSkewX + impactSkewX;
    const totalSkewY = skewY + wobbleSkewY.value + flightSkewY + impactSkewY;

    return {
      transform: [
        // Position at BODY center (the lagging part)
        { translateX: bodyX.value + wobbleX.value },
        { translateY: bodyY.value + wobbleY.value },
        // Skew creates the stretchy teardrop shape
        { skewX: `${totalSkewX}deg` },
        { skewY: `${totalSkewY}deg` },
        // Scale for stretch/compress
        { scaleX },
        { scaleY },
      ],
      borderTopLeftRadius: (tl / 100) * minDim,
      borderTopRightRadius: (tr / 100) * minDim,
      borderBottomRightRadius: (br / 100) * minDim,
      borderBottomLeftRadius: (bl / 100) * minDim,
    };
  });

  // Animated styles for eyes (blink)
  const eyeStyle = useAnimatedStyle(() => {
    const scaleY = interpolate(blinkProgress.value, [0, 1], [1, 0.1]);
    return {
      transform: [{ scaleY }],
    };
  });

  // Face follows body with subtle offset toward grab point
  const faceStyle = useAnimatedStyle(() => {
    // Face is pulled subtly toward the grab point
    const faceOffsetX = (grabX.value - bodyX.value) * 0.08;
    const faceOffsetY = (grabY.value - bodyY.value) * 0.08;

    return {
      transform: [
        { translateX: bodyX.value + wobbleX.value * 0.4 + faceOffsetX },
        { translateY: bodyY.value + wobbleY.value * 0.4 + faceOffsetY },
      ],
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {/* Slime blob body */}
        <Animated.View
          style={[
            styles.blob,
            { backgroundColor: colors.slime.mint },
            slimeStyle,
          ]}
        />

        {/* Face layer */}
        <Animated.View style={[styles.faceContainer, faceStyle]}>
          {/* Eyes */}
          <View style={styles.eyesContainer}>
            <Animated.View style={[styles.eye, eyeStyle]} />
            <Animated.View style={[styles.eye, eyeStyle]} />
          </View>

          {/* Mouth */}
          <View style={styles.mouthContainer}>
            <View style={styles.mouth} />
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
  },
  faceContainer: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginBottom: 4,
  },
  eye: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1a1a1a',
  },
  mouthContainer: {
    marginTop: 2,
  },
  mouth: {
    width: 14,
    height: 5,
    backgroundColor: 'transparent',
    borderColor: 'rgba(26, 26, 26, 0.5)',
    borderWidth: 2,
    borderTopWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});
