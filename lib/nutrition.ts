/**
 * Nutrition calculation utilities
 * Uses Mifflin-St Jeor formula for BMR/TDEE calculations
 */

import { UserMetrics, NutritionGoals } from '@/types';

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<UserMetrics['activityLevel'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + s
 * where s = +5 for males, -161 for females
 */
export function calculateBMR(metrics: UserMetrics): number {
  const { age, gender, weightKg, heightCm } = metrics;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'male') {
    return base + 5;
  } else if (gender === 'female') {
    return base - 161;
  }
  // For 'other', use average of male/female
  return base - 78;
}

/**
 * Calculate Total Daily Energy Expenditure
 * TDEE = BMR × activity multiplier
 */
export function calculateTDEE(metrics: UserMetrics): number {
  const bmr = calculateBMR(metrics);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[metrics.activityLevel]);
}

/**
 * Calculate nutrition goals based on user metrics and fitness goal
 */
export function calculateNutritionGoals(
  metrics: UserMetrics,
  fitnessGoal: string
): NutritionGoals {
  const tdee = calculateTDEE(metrics);

  // Determine calorie target based on goal
  let calories = tdee;
  let goal: NutritionGoals['goal'] = 'maintain';

  const goalLower = fitnessGoal.toLowerCase();
  if (goalLower.includes('lose') || goalLower.includes('weight loss')) {
    calories = Math.round(tdee * 0.8); // 20% deficit
    goal = 'lose';
  } else if (
    goalLower.includes('build') ||
    goalLower.includes('muscle') ||
    goalLower.includes('gain')
  ) {
    calories = Math.round(tdee * 1.1); // 10% surplus
    goal = 'gain';
  }

  // Calculate macros
  // Protein: ~0.8-1g per lb of body weight for active individuals
  const weightLbs = metrics.weightKg * 2.205;
  const proteinG = Math.round(weightLbs * 0.9); // 0.9g per lb
  const proteinCals = proteinG * 4;

  // Fat: ~27% of calories
  const fatCals = calories * 0.27;
  const fatG = Math.round(fatCals / 9);

  // Carbs: remainder of calories
  const carbsCals = calories - proteinCals - fatCals;
  const carbsG = Math.round(carbsCals / 4);

  return {
    tdee,
    calories,
    proteinG,
    carbsG,
    fatG,
    goal,
  };
}

// ============================================
// UNIT CONVERSION HELPERS
// ============================================

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

/**
 * Convert feet and inches to centimeters
 */
export function ftInToCm(feet: number, inches: number = 0): number {
  return (feet * 12 + inches) * 2.54;
}

/**
 * Convert centimeters to feet and inches
 */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Parse height string like "5'10" or "5 ft 10 in" to cm
 */
export function parseHeightToCm(heightStr: string, unit: 'cm' | 'ft' = 'ft'): number {
  if (unit === 'cm') {
    return parseFloat(heightStr) || 170;
  }

  // Parse feet/inches format
  const match = heightStr.match(/(\d+)['\s]*(?:ft)?[.\s]*(\d*)/i);
  if (match) {
    const feet = parseInt(match[1]) || 0;
    const inches = parseInt(match[2]) || 0;
    return ftInToCm(feet, inches);
  }

  return 170; // Default to 170cm if parsing fails
}

/**
 * Parse activity level from response string
 */
export function parseActivityLevel(response: string): UserMetrics['activityLevel'] {
  const lower = response.toLowerCase();
  if (lower.includes('sedentary')) return 'sedentary';
  if (lower.includes('lightly') || lower.includes('light')) return 'light';
  if (lower.includes('moderately') || lower.includes('moderate')) return 'moderate';
  if (lower.includes('very active') || lower.includes('hard exercise')) return 'active';
  if (lower.includes('extremely') || lower.includes('athlete')) return 'very_active';
  return 'moderate'; // default
}

/**
 * Parse gender from response string
 */
export function parseGender(response: string): UserMetrics['gender'] {
  const lower = response.toLowerCase();
  if (lower.includes('male') && !lower.includes('female')) return 'male';
  if (lower.includes('female')) return 'female';
  return 'other';
}
