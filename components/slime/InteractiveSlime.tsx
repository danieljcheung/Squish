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

// Flick/momentum physics - heavy, dense slime feel
const FRICTION = 0.992;           // Higher = slides more, slower decay (heavy blob)
const BOUNCE_DAMPING = 0.32;      // Low = loses ~68% energy on bounce (thud, not spring)
const MIN_VELOCITY = 20;          // Stop physics below this velocity
const FLICK_VELOCITY_SCALE = 0.75; // Scale down raw velocity for more control
const IMPACT_SQUISH_DURATION = 120; // ms for wall squish (longer = heavier impact)
const IMPACT_RECOVERY_DURATION = 320; // ms to recover from wall squish (slower = more weight)

interface InteractiveSlimeProps {
  containerWidth: number;
  containerHeight: number;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

export default function InteractiveSlime({
  containerWidth,
  containerHeight,
  onGestureStart,
  onGestureEnd,
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

  // Press squish (finger pressing down on slime)
  const pressSquish = useSharedValue(0); // 0 = normal, 1 = fully pressed

  // Easter egg: rapid tap explosion
  const tapCount = useSharedValue(0);
  const lastTapTime = useSharedValue(0);
  const puffiness = useSharedValue(0); // 0 = normal, builds up with taps
  const isExploding = useSharedValue(false);
  const explosionProgress = useSharedValue(0); // 0 = normal, 1 = fully expanded
  const TAP_THRESHOLD = 6; // Number of taps to trigger
  const TAP_TIMEOUT = 400; // ms between taps before reset

  // Easter egg: two-finger pull apart (split)
  const isPinching = useSharedValue(false);
  const isSplit = useSharedValue(false);
  const pinchScale = useSharedValue(1);
  const pinchCenterX = useSharedValue(0);
  const pinchCenterY = useSharedValue(0);
  const stretchDistance = useSharedValue(0); // Distance between fingers
  const SPLIT_THRESHOLD = 180; // px apart to trigger split

  // Split slime positions (two smaller slimes after split)
  const slime1X = useSharedValue(0);
  const slime1Y = useSharedValue(0);
  const slime1VelX = useSharedValue(0);
  const slime1VelY = useSharedValue(0);
  const slime2X = useSharedValue(0);
  const slime2Y = useSharedValue(0);
  const slime2VelX = useSharedValue(0);
  const slime2VelY = useSharedValue(0);
  const splitProgress = useSharedValue(0); // 0 = together, 1 = fully split
  const mergeProgress = useSharedValue(0); // 0 = split, 1 = merged back

  // Merge animation state
  const mergePhase = useSharedValue(0); // 0=bouncing, 1=crawling, 2=approaching, 3=contact, 4=merged
  const crawlProgress = useSharedValue(0); // 0-1 cycles for inchworm motion
  const slime1CrawlStretch = useSharedValue(1); // Stretch factor during crawl
  const slime2CrawlStretch = useSharedValue(1);
  const bridgeProgress = useSharedValue(0); // 0=no bridge, 1=fully connected
  const MINI_SLIME_SCALE = 0.5; // Exactly 50% of original size

  // Split slime 1 deformation state
  const slime1ImpactX = useSharedValue(0);
  const slime1ImpactY = useSharedValue(0);
  const slime1Wobble = useSharedValue(1);
  const slime1FlightX = useSharedValue(0);
  const slime1FlightY = useSharedValue(0);

  // Split slime 2 deformation state
  const slime2ImpactX = useSharedValue(0);
  const slime2ImpactY = useSharedValue(0);
  const slime2Wobble = useSharedValue(1);
  const slime2FlightX = useSharedValue(0);
  const slime2FlightY = useSharedValue(0)

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
      // Trigger impact squish - heavy thud (no springy overshoot)
      impactSquishX.value = withSequence(
        withTiming(-1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
      // Edge collision visual
      edgeLeft.value = withSequence(
        withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
    }

    // Right wall
    if (newX >= bounds.maxX) {
      newX = bounds.maxX;
      velocityX.value = -velocityX.value * BOUNCE_DAMPING;
      bounced = true;
      impactSquishX.value = withSequence(
        withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
      edgeRight.value = withSequence(
        withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
    }

    // Top wall
    if (newY <= bounds.minY) {
      newY = bounds.minY;
      velocityY.value = -velocityY.value * BOUNCE_DAMPING;
      bounced = true;
      impactSquishY.value = withSequence(
        withTiming(-1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
      edgeTop.value = withSequence(
        withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
    }

    // Bottom wall
    if (newY >= bounds.maxY) {
      newY = bounds.maxY;
      velocityY.value = -velocityY.value * BOUNCE_DAMPING;
      bounced = true;
      impactSquishY.value = withSequence(
        withTiming(1.0, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
      edgeBottom.value = withSequence(
        withTiming(0.8, { duration: IMPACT_SQUISH_DURATION }),
        withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
      );
    }

    // Trigger wobble on bounce - heavy thud, not springy
    if (bounced) {
      const impactIntensity = Math.min(0.9, speed / 500);
      // Heavy splat: quick compress, slow recovery, minimal oscillation
      wobbleScale.value = withSequence(
        withTiming(1 - impactIntensity * 0.1, { duration: 60 }), // Quick squish on impact
        withTiming(1 + impactIntensity * 0.03, { duration: 150, easing: Easing.out(Easing.quad) }), // Slow slight bulge
        withSpring(1, { damping: 15, stiffness: 80 }) // Heavy settle, minimal bounce
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

  // Easter egg: reset after explosion animation
  const resetAfterExplosion = () => {
    setTimeout(() => {
      isExploding.value = false;
      tapCount.value = 0;
    }, 1700);
  };

  // Easter egg: trigger explosion animation (called from JS)
  const triggerExplosion = () => {
    if (isExploding.value) return; // Already exploding

    isExploding.value = true;

    // Reset position to center for explosion
    cancelAnimation(bodyX);
    cancelAnimation(bodyY);
    cancelAnimation(grabX);
    cancelAnimation(grabY);
    bodyX.value = withTiming(0, { duration: 100 });
    bodyY.value = withTiming(0, { duration: 100 });
    grabX.value = withTiming(0, { duration: 100 });
    grabY.value = withTiming(0, { duration: 100 });

    // Squish against all edges during expansion
    edgeLeft.value = withSequence(
      withDelay(200, withTiming(0.8, { duration: 150 })),
      withDelay(600, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }))
    );
    edgeRight.value = withSequence(
      withDelay(200, withTiming(0.8, { duration: 150 })),
      withDelay(600, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }))
    );
    edgeTop.value = withSequence(
      withDelay(200, withTiming(0.8, { duration: 150 })),
      withDelay(600, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }))
    );
    edgeBottom.value = withSequence(
      withDelay(200, withTiming(0.8, { duration: 150 })),
      withDelay(600, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }))
    );

    // Explosion sequence: expand -> pulse -> contract
    explosionProgress.value = withSequence(
      // Phase 1: Explosion - expand to fill container (350ms)
      withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.2)) }),
      // Phase 2: Subtle pulse while expanded
      withTiming(0.96, { duration: 150 }),
      withTiming(1, { duration: 150 }),
      withTiming(0.97, { duration: 150 }),
      withTiming(1, { duration: 150 }),
      // Phase 3: Contract back - ooze back together
      withTiming(0, { duration: 800, easing: Easing.inOut(Easing.cubic) })
    );

    // Reset puffiness during contraction
    puffiness.value = withDelay(900, withTiming(0, { duration: 400 }));

    // Schedule reset after animation completes
    resetAfterExplosion();
  };

  // Handle tap for easter egg (worklet)
  const handleTap = () => {
    'worklet';
    if (isExploding.value) return; // Ignore taps during explosion

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.value;

    if (timeSinceLastTap > TAP_TIMEOUT) {
      // Too long since last tap, reset counter
      tapCount.value = 1;
      puffiness.value = withSpring(0.1, { damping: 8, stiffness: 200 });
    } else {
      // Rapid tap! Increment counter
      tapCount.value = tapCount.value + 1;

      // Increase puffiness with each tap (builds up excitement)
      const newPuffiness = Math.min(1, tapCount.value / TAP_THRESHOLD);
      puffiness.value = withSpring(newPuffiness, { damping: 6, stiffness: 300 });

      // Add extra wobble with each tap
      const wobbleIntensity = 0.03 + (tapCount.value * 0.015);
      wobbleScale.value = withSequence(
        withTiming(1 + wobbleIntensity, { duration: 50 }),
        withSpring(1, { damping: 6, stiffness: 200 })
      );

      // Check if threshold reached
      if (tapCount.value >= TAP_THRESHOLD) {
        runOnJS(triggerExplosion)();
      }
    }

    lastTapTime.value = now;
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
    .onBegin(() => {
      // onBegin fires immediately when finger touches down
      // Track tap for easter egg
      handleTap();

      // Skip press squish if exploding
      if (isExploding.value) return;

      // Press squish - compress down like pressing a stress ball
      cancelAnimation(pressSquish);
      pressSquish.value = withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) });
    })
    .onStart(() => {
      isDragging.value = true;
      isFlicking.value = false; // Stop any flick physics

      // Notify parent that gesture started (for scroll blocking)
      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }

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
    })
    .onFinalize(() => {
      // onFinalize fires when finger lifts (whether dragged or not)
      // Release press squish - spring back with small wobble
      pressSquish.value = withSpring(0, { damping: 10, stiffness: 400 });

      // Notify parent that gesture ended (for scroll unblocking)
      if (onGestureEnd) {
        runOnJS(onGestureEnd)();
      }
    });

  // Trigger split animation
  const triggerSplit = () => {
    'worklet';
    if (isSplit.value) return;

    isSplit.value = true;
    splitProgress.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) });

    // Position the two slimes where the stretch ended
    const offsetX = stretchDistance.value * 0.3;
    slime1X.value = bodyX.value - offsetX;
    slime1Y.value = bodyY.value;
    slime2X.value = bodyX.value + offsetX;
    slime2Y.value = bodyY.value;

    // Give them velocity to bounce apart
    slime1VelX.value = -150;
    slime1VelY.value = (Math.random() - 0.5) * 100;
    slime2VelX.value = 150;
    slime2VelY.value = (Math.random() - 0.5) * 100;
  };

  // Pinch gesture for two-finger stretch
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      if (isSplit.value || isExploding.value) return;
      isPinching.value = true;
      stretchDistance.value = 0;

      // Notify parent that gesture started
      if (onGestureStart) {
        runOnJS(onGestureStart)();
      }
    })
    .onUpdate((event) => {
      if (isSplit.value || isExploding.value) return;

      // Track stretch distance based on scale
      // Scale of 1 = fingers at starting distance, >1 = fingers spreading apart
      const baseDistance = 60; // Starting finger distance approximation
      stretchDistance.value = baseDistance * (event.scale - 1) * 2;
      pinchScale.value = event.scale;
      pinchCenterX.value = event.focalX - containerWidth / 2;
      pinchCenterY.value = event.focalY - containerHeight / 2;

      // Check if we've hit the split threshold
      if (stretchDistance.value > SPLIT_THRESHOLD) {
        triggerSplit();
      }
    })
    .onEnd(() => {
      isPinching.value = false;

      if (!isSplit.value) {
        // Didn't split - snap back
        stretchDistance.value = withSpring(0, SNAPBACK_SPRING);
        pinchScale.value = withSpring(1, SNAPBACK_SPRING);

        // Trigger wobble
        wobbleScale.value = withSequence(
          withTiming(0.92, { duration: 80 }),
          withSpring(1, WOBBLE_SPRING)
        );
      } else {
        // Start in bouncing phase - physics callback will transition to crawl when settled
        mergePhase.value = 0;
        crawlProgress.value = 0;
        bridgeProgress.value = 0;
        slime1CrawlStretch.value = 1;
        slime2CrawlStretch.value = 1;
      }

      // Notify parent that gesture ended
      if (onGestureEnd) {
        runOnJS(onGestureEnd)();
      }
    });

  // Compose gestures - pinch takes priority when two fingers detected
  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // Split slime physics simulation - uses same constants as main slime
  useFrameCallback(() => {
    if (!isSplit.value) return;

    const dt = 1 / 60;
    const splitFriction = FRICTION;
    const splitBounceDamping = BOUNCE_DAMPING;
    const smallBounds = {
      minX: bounds.minX + 20,
      maxX: bounds.maxX - 20,
      minY: bounds.minY + 15,
      maxY: bounds.maxY - 15,
    };

    // Calculate distance between slimes
    const dx = slime2X.value - slime1X.value;
    const dy = slime2Y.value - slime1Y.value;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dist > 0 ? dx / dist : 1;
    const ny = dist > 0 ? dy / dist : 0;

    // Phase 0: Bouncing - normal physics until velocities settle
    if (mergePhase.value === 0) {
      // Update slime 1 velocity and position
      slime1VelX.value *= splitFriction;
      slime1VelY.value *= splitFriction;
      slime1X.value += slime1VelX.value * dt;
      slime1Y.value += slime1VelY.value * dt;

      // Flight deformation for slime 1
      const speed1 = Math.sqrt(slime1VelX.value ** 2 + slime1VelY.value ** 2);
      if (speed1 > MIN_VELOCITY) {
        slime1FlightX.value = (slime1VelX.value / speed1) * Math.min(1, speed1 / 600) * 0.15;
        slime1FlightY.value = (slime1VelY.value / speed1) * Math.min(1, speed1 / 600) * 0.15;
      } else {
        slime1FlightX.value *= 0.9;
        slime1FlightY.value *= 0.9;
      }

      // Bounce slime 1 off walls
      if (slime1X.value < smallBounds.minX) {
        slime1X.value = smallBounds.minX;
        slime1VelX.value = Math.abs(slime1VelX.value) * splitBounceDamping;
        slime1ImpactX.value = withSequence(
          withTiming(-1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime1Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed1 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      } else if (slime1X.value > smallBounds.maxX) {
        slime1X.value = smallBounds.maxX;
        slime1VelX.value = -Math.abs(slime1VelX.value) * splitBounceDamping;
        slime1ImpactX.value = withSequence(
          withTiming(1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime1Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed1 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      }
      if (slime1Y.value < smallBounds.minY) {
        slime1Y.value = smallBounds.minY;
        slime1VelY.value = Math.abs(slime1VelY.value) * splitBounceDamping;
        slime1ImpactY.value = withSequence(
          withTiming(-1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime1Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed1 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      } else if (slime1Y.value > smallBounds.maxY) {
        slime1Y.value = smallBounds.maxY;
        slime1VelY.value = -Math.abs(slime1VelY.value) * splitBounceDamping;
        slime1ImpactY.value = withSequence(
          withTiming(1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime1Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed1 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      }

      // Update slime 2 velocity and position
      slime2VelX.value *= splitFriction;
      slime2VelY.value *= splitFriction;
      slime2X.value += slime2VelX.value * dt;
      slime2Y.value += slime2VelY.value * dt;

      // Flight deformation for slime 2
      const speed2 = Math.sqrt(slime2VelX.value ** 2 + slime2VelY.value ** 2);
      if (speed2 > MIN_VELOCITY) {
        slime2FlightX.value = (slime2VelX.value / speed2) * Math.min(1, speed2 / 600) * 0.15;
        slime2FlightY.value = (slime2VelY.value / speed2) * Math.min(1, speed2 / 600) * 0.15;
      } else {
        slime2FlightX.value *= 0.9;
        slime2FlightY.value *= 0.9;
      }

      // Bounce slime 2 off walls
      if (slime2X.value < smallBounds.minX) {
        slime2X.value = smallBounds.minX;
        slime2VelX.value = Math.abs(slime2VelX.value) * splitBounceDamping;
        slime2ImpactX.value = withSequence(
          withTiming(-1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime2Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed2 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      } else if (slime2X.value > smallBounds.maxX) {
        slime2X.value = smallBounds.maxX;
        slime2VelX.value = -Math.abs(slime2VelX.value) * splitBounceDamping;
        slime2ImpactX.value = withSequence(
          withTiming(1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime2Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed2 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      }
      if (slime2Y.value < smallBounds.minY) {
        slime2Y.value = smallBounds.minY;
        slime2VelY.value = Math.abs(slime2VelY.value) * splitBounceDamping;
        slime2ImpactY.value = withSequence(
          withTiming(-1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime2Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed2 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      } else if (slime2Y.value > smallBounds.maxY) {
        slime2Y.value = smallBounds.maxY;
        slime2VelY.value = -Math.abs(slime2VelY.value) * splitBounceDamping;
        slime2ImpactY.value = withSequence(
          withTiming(1, { duration: IMPACT_SQUISH_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: IMPACT_RECOVERY_DURATION, easing: Easing.out(Easing.cubic) })
        );
        slime2Wobble.value = withSequence(
          withTiming(1 - Math.min(0.15, speed2 / 800), { duration: 60 }),
          withSpring(1, { damping: 15, stiffness: 80 })
        );
      }

      // Collision between the two slimes
      const minDist = 70; // 50% scale collision radius
      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;

        // Push apart
        slime1X.value -= nx * overlap * 0.5;
        slime1Y.value -= ny * overlap * 0.5;
        slime2X.value += nx * overlap * 0.5;
        slime2Y.value += ny * overlap * 0.5;

        // Collision response
        const relVelX = slime2VelX.value - slime1VelX.value;
        const relVelY = slime2VelY.value - slime1VelY.value;
        const relVelDot = relVelX * nx + relVelY * ny;

        if (relVelDot < 0) {
          const impulse = relVelDot * (1 + splitBounceDamping);
          slime1VelX.value += impulse * nx * 0.5;
          slime1VelY.value += impulse * ny * 0.5;
          slime2VelX.value -= impulse * nx * 0.5;
          slime2VelY.value -= impulse * ny * 0.5;

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

          const collisionSpeed = Math.abs(relVelDot);
          slime1Wobble.value = withSequence(
            withTiming(1 - Math.min(0.12, collisionSpeed / 600), { duration: 60 }),
            withTiming(1 + Math.min(0.04, collisionSpeed / 2000), { duration: 150, easing: Easing.out(Easing.quad) }),
            withSpring(1, { damping: 15, stiffness: 80 })
          );
          slime2Wobble.value = withSequence(
            withTiming(1 - Math.min(0.12, collisionSpeed / 600), { duration: 60 }),
            withTiming(1 + Math.min(0.04, collisionSpeed / 2000), { duration: 150, easing: Easing.out(Easing.quad) }),
            withSpring(1, { damping: 15, stiffness: 80 })
          );
        }
      }

      // Check if settled - transition to crawling phase
      const totalSpeed = speed1 + speed2;
      if (totalSpeed < MIN_VELOCITY * 2) {
        mergePhase.value = 1;
        crawlProgress.value = 0;
      }
    }

    // Phase 1: Crawling - inchworm motion toward center
    else if (mergePhase.value === 1) {
      // Clear flight deformation
      slime1FlightX.value *= 0.9;
      slime1FlightY.value *= 0.9;
      slime2FlightX.value *= 0.9;
      slime2FlightY.value *= 0.9;

      // Crawl speed (slow and gooey)
      const crawlSpeed = 0.4; // pixels per frame
      crawlProgress.value += dt * 2; // Cycle every ~0.5 seconds

      // Inchworm motion: compress then extend
      const crawlCycle = Math.sin(crawlProgress.value * Math.PI * 2);
      const stretchPhase = Math.cos(crawlProgress.value * Math.PI * 2);

      // Slime 1 crawls toward slime 2
      slime1CrawlStretch.value = 1 + crawlCycle * 0.15;
      // Move during extend phase (when stretchPhase > 0)
      if (stretchPhase > 0) {
        slime1X.value += nx * crawlSpeed * stretchPhase;
        slime1Y.value += ny * crawlSpeed * stretchPhase;
      }

      // Slime 2 crawls toward slime 1 (opposite direction, offset phase)
      slime2CrawlStretch.value = 1 + Math.sin((crawlProgress.value + 0.25) * Math.PI * 2) * 0.15;
      const stretch2Phase = Math.cos((crawlProgress.value + 0.25) * Math.PI * 2);
      if (stretch2Phase > 0) {
        slime2X.value -= nx * crawlSpeed * stretch2Phase;
        slime2Y.value -= ny * crawlSpeed * stretch2Phase;
      }

      // Check if close enough for approach phase
      if (dist < 80) {
        mergePhase.value = 2;
      }
    }

    // Phase 2: Approaching - slow down and extend toward each other
    else if (mergePhase.value === 2) {
      // Continue slower crawl
      crawlProgress.value += dt * 1.5;

      // Slow approach
      const approachSpeed = 0.2;
      slime1X.value += nx * approachSpeed;
      slime1Y.value += ny * approachSpeed;
      slime2X.value -= nx * approachSpeed;
      slime2Y.value -= ny * approachSpeed;

      // Extend toward each other (stretch in direction of other slime)
      const extendAmount = interpolate(dist, [70, 40], [0, 0.25], Extrapolation.CLAMP);
      slime1CrawlStretch.value = 1 + extendAmount;
      slime2CrawlStretch.value = 1 + extendAmount;

      // Check if close enough for contact
      if (dist < 45) {
        mergePhase.value = 3;
        bridgeProgress.value = 0;
      }
    }

    // Phase 3: Contact - bridge forms and thickens
    else if (mergePhase.value === 3) {
      // Bridge grows
      bridgeProgress.value += dt * 2;

      // Pull together as bridge strengthens
      const pullSpeed = interpolate(bridgeProgress.value, [0, 1], [0.3, 1.5]);
      slime1X.value += nx * pullSpeed;
      slime1Y.value += ny * pullSpeed;
      slime2X.value -= nx * pullSpeed;
      slime2Y.value -= ny * pullSpeed;

      // Stretch toward each other
      slime1CrawlStretch.value = 1 + 0.3 * (1 - bridgeProgress.value);
      slime2CrawlStretch.value = 1 + 0.3 * (1 - bridgeProgress.value);

      // Check if merged
      if (dist < 15 || bridgeProgress.value > 1) {
        mergePhase.value = 4;
        mergeProgress.value = withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }, () => {
          // Reset everything
          isSplit.value = false;
          splitProgress.value = 0;
          mergeProgress.value = 0;
          mergePhase.value = 0;
          bridgeProgress.value = 0;
          slime1CrawlStretch.value = 1;
          slime2CrawlStretch.value = 1;
          const centerX = (slime1X.value + slime2X.value) / 2;
          const centerY = (slime1Y.value + slime2Y.value) / 2;
          bodyX.value = centerX;
          bodyY.value = centerY;
          grabX.value = centerX;
          grabY.value = centerY;
          // Wobble on reform
          wobbleScale.value = withSequence(
            withTiming(1.15, { duration: 100 }),
            withSpring(1, WOBBLE_SPRING)
          );
        });
      }
    }
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

    // Press squish - finger pressing down compresses vertically, bulges horizontally
    // Like pressing a stress ball from above
    const pressCompressY = 1 - pressSquish.value * 0.15; // 15% vertical compression
    const pressBulgeX = 1 + pressSquish.value * 0.08; // 8% horizontal bulge (volume preservation)

    // Easter egg: puffiness (builds up with rapid taps)
    const puffScale = 1 + puffiness.value * 0.25; // Up to 25% bigger when fully puffed

    // Easter egg: explosion scale (fills container)
    // Calculate how much to scale to fill the container
    const explosionScaleX = interpolate(
      explosionProgress.value,
      [0, 1],
      [1, (containerWidth / SLIME_WIDTH) * 1.1], // Slightly overflow for squish effect
      Extrapolation.CLAMP
    );
    const explosionScaleY = interpolate(
      explosionProgress.value,
      [0, 1],
      [1, (containerHeight / SLIME_HEIGHT) * 1.1],
      Extrapolation.CLAMP
    );

    // Easter egg: pinch stretch (two-finger pull apart)
    const pinchStretchX = isPinching.value
      ? interpolate(stretchDistance.value, [0, SPLIT_THRESHOLD], [1, 1.8], Extrapolation.CLAMP)
      : 1;
    const pinchStretchY = isPinching.value
      ? interpolate(stretchDistance.value, [0, SPLIT_THRESHOLD], [1, 0.6], Extrapolation.CLAMP)
      : 1;

    // Combine all scale effects
    let scaleX = breathScale * idleSquishX * directionalStretchX * horizontalSquish * horizontalBulge * wobbleScale.value * flightScaleX * flightCompressX * impactCompressX * impactBulgeX * pressBulgeX * puffScale * explosionScaleX * pinchStretchX;
    let scaleY = breathScale * idleSquishY * directionalStretchY * verticalSquish * verticalBulge * wobbleScale.value * flightScaleY * flightCompressY * impactCompressY * impactBulgeY * pressCompressY * puffScale * explosionScaleY * pinchStretchY;

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

    // Hide main slime when split
    const opacity = isSplit.value ? 0 : 1;

    return {
      opacity,
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

    // Hide during split
    const opacity = isSplit.value ? 0 : 1;

    return {
      opacity,
      transform: [
        { translateX: bodyX.value + wobbleX.value * 0.4 + faceOffsetX },
        { translateY: bodyY.value + wobbleY.value * 0.4 + faceOffsetY },
      ],
    };
  });

  // Split slime 1 style (left) - with full deformation like main slime
  const splitSlime1Style = useAnimatedStyle(() => {
    if (!isSplit.value) {
      return { opacity: 0 };
    }

    // 50% scale, grows slightly during merge
    const baseScale = interpolate(mergeProgress.value, [0, 1], [MINI_SLIME_SCALE, MINI_SLIME_SCALE * 1.4]);
    const opacity = interpolate(mergeProgress.value, [0.8, 1], [1, 0], Extrapolation.CLAMP);

    // Impact squish - compress against wall, bulge perpendicular
    const impactCompressX = 1 - Math.abs(slime1ImpactX.value) * 0.2;
    const impactCompressY = 1 - Math.abs(slime1ImpactY.value) * 0.2;
    const impactBulgeX = 1 + Math.abs(slime1ImpactY.value) * 0.12;
    const impactBulgeY = 1 + Math.abs(slime1ImpactX.value) * 0.12;

    // Flight deformation - stretch in movement direction
    const flightScaleX = 1 + Math.abs(slime1FlightX.value) * 1.5;
    const flightScaleY = 1 + Math.abs(slime1FlightY.value) * 1.5;
    const flightCompressX = 1 - Math.abs(slime1FlightY.value) * 0.5;
    const flightCompressY = 1 - Math.abs(slime1FlightX.value) * 0.5;

    // Flight skew - tilt in direction of movement
    const flightSkewX = slime1FlightY.value * 30;
    const flightSkewY = -slime1FlightX.value * 30;

    // Impact skew
    const impactSkewX = slime1ImpactY.value * 10;
    const impactSkewY = -slime1ImpactX.value * 10;

    // Crawl stretch - direction toward slime2
    const dx = slime2X.value - slime1X.value;
    const dy = slime2Y.value - slime1Y.value;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dist > 0 ? dx / dist : 1;
    const dirY = dist > 0 ? dy / dist : 0;

    // Crawl stretch stretches toward the other slime (horizontal stretch when moving horizontally)
    const crawlStretchX = 1 + (slime1CrawlStretch.value - 1) * Math.abs(dirX);
    const crawlStretchY = 1 + (slime1CrawlStretch.value - 1) * Math.abs(dirY);
    // Compress perpendicular to movement direction
    const crawlCompressX = 1 - (slime1CrawlStretch.value - 1) * 0.5 * Math.abs(dirY);
    const crawlCompressY = 1 - (slime1CrawlStretch.value - 1) * 0.5 * Math.abs(dirX);

    const scaleX = baseScale * slime1Wobble.value * impactCompressX * impactBulgeX * flightScaleX * flightCompressX * crawlStretchX * crawlCompressX;
    const scaleY = baseScale * slime1Wobble.value * impactCompressY * impactBulgeY * flightScaleY * flightCompressY * crawlStretchY * crawlCompressY;

    return {
      opacity,
      transform: [
        { translateX: slime1X.value },
        { translateY: slime1Y.value },
        { skewX: `${flightSkewX + impactSkewX}deg` },
        { skewY: `${flightSkewY + impactSkewY}deg` },
        { scaleX },
        { scaleY },
      ],
    };
  });

  // Split slime 2 style (right) - with full deformation like main slime
  const splitSlime2Style = useAnimatedStyle(() => {
    if (!isSplit.value) {
      return { opacity: 0 };
    }

    // 50% scale, grows slightly during merge
    const baseScale = interpolate(mergeProgress.value, [0, 1], [MINI_SLIME_SCALE, MINI_SLIME_SCALE * 1.4]);
    const opacity = interpolate(mergeProgress.value, [0.8, 1], [1, 0], Extrapolation.CLAMP);

    // Impact squish - compress against wall, bulge perpendicular
    const impactCompressX = 1 - Math.abs(slime2ImpactX.value) * 0.2;
    const impactCompressY = 1 - Math.abs(slime2ImpactY.value) * 0.2;
    const impactBulgeX = 1 + Math.abs(slime2ImpactY.value) * 0.12;
    const impactBulgeY = 1 + Math.abs(slime2ImpactX.value) * 0.12;

    // Flight deformation - stretch in movement direction
    const flightScaleX = 1 + Math.abs(slime2FlightX.value) * 1.5;
    const flightScaleY = 1 + Math.abs(slime2FlightY.value) * 1.5;
    const flightCompressX = 1 - Math.abs(slime2FlightY.value) * 0.5;
    const flightCompressY = 1 - Math.abs(slime2FlightX.value) * 0.5;

    // Flight skew - tilt in direction of movement
    const flightSkewX = slime2FlightY.value * 30;
    const flightSkewY = -slime2FlightX.value * 30;

    // Impact skew
    const impactSkewX = slime2ImpactY.value * 10;
    const impactSkewY = -slime2ImpactX.value * 10;

    // Crawl stretch - direction toward slime1
    const dx = slime1X.value - slime2X.value;
    const dy = slime1Y.value - slime2Y.value;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dist > 0 ? dx / dist : -1;
    const dirY = dist > 0 ? dy / dist : 0;

    // Crawl stretch stretches toward the other slime
    const crawlStretchX = 1 + (slime2CrawlStretch.value - 1) * Math.abs(dirX);
    const crawlStretchY = 1 + (slime2CrawlStretch.value - 1) * Math.abs(dirY);
    // Compress perpendicular to movement direction
    const crawlCompressX = 1 - (slime2CrawlStretch.value - 1) * 0.5 * Math.abs(dirY);
    const crawlCompressY = 1 - (slime2CrawlStretch.value - 1) * 0.5 * Math.abs(dirX);

    const scaleX = baseScale * slime2Wobble.value * impactCompressX * impactBulgeX * flightScaleX * flightCompressX * crawlStretchX * crawlCompressX;
    const scaleY = baseScale * slime2Wobble.value * impactCompressY * impactBulgeY * flightScaleY * flightCompressY * crawlStretchY * crawlCompressY;

    return {
      opacity,
      transform: [
        { translateX: slime2X.value },
        { translateY: slime2Y.value },
        { skewX: `${flightSkewX + impactSkewX}deg` },
        { skewY: `${flightSkewY + impactSkewY}deg` },
        { scaleX },
        { scaleY },
      ],
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <View style={styles.container}>
        {/* Main slime blob body - hidden when split */}
        <Animated.View
          style={[
            styles.blob,
            { backgroundColor: colors.slime.mint },
            slimeStyle,
          ]}
        />

        {/* Face layer - hidden when split */}
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

        {/* Split slime 1 (left) */}
        <Animated.View style={[styles.splitSlime, splitSlime1Style]}>
          <View style={[styles.splitSlimeBlob, { backgroundColor: colors.slime.mint }]} />
          <View style={styles.splitSlimeFace}>
            <View style={styles.splitEyesContainer}>
              <View style={styles.splitEye} />
              <View style={styles.splitEye} />
            </View>
            <View style={styles.splitMouth} />
          </View>
        </Animated.View>

        {/* Split slime 2 (right) */}
        <Animated.View style={[styles.splitSlime, splitSlime2Style]}>
          <View style={[styles.splitSlimeBlob, { backgroundColor: colors.slime.mint }]} />
          <View style={styles.splitSlimeFace}>
            <View style={styles.splitEyesContainer}>
              <View style={styles.splitEye} />
              <View style={styles.splitEye} />
            </View>
            <View style={styles.splitMouth} />
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
  // Split slime styles (smaller versions)
  splitSlime: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitSlimeBlob: {
    position: 'absolute',
    width: SLIME_WIDTH,
    height: SLIME_HEIGHT,
    borderRadius: 50,
  },
  splitSlimeFace: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitEyesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 2,
  },
  splitEye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a1a',
  },
  splitMouth: {
    width: 8,
    height: 3,
    backgroundColor: 'transparent',
    borderColor: 'rgba(26, 26, 26, 0.5)',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: 1,
  },
});
