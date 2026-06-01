/**
 * GPT-APP / AI-NAVIGATOR
 * UI-2.5 — project-local UI utility helpers
 *
 * Boundary:
 * - No package dependencies.
 * - No imports.
 * - No Tailwind merge.
 * - No clsx dependency.
 * - No runtime side effects.
 *
 * This file intentionally provides a small local className composer
 * for UI primitives created inside src/components/ui/.
 */

export type UiClassDictionary = Record<string, boolean | null | undefined>;

export type UiClassArray = UiClassValue[];

export type UiClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | UiClassDictionary
  | UiClassArray;

function appendClassValue(value: UiClassValue, output: string[]): void {
  if (value === null || value === undefined || value === false) {
    return;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (normalized.length > 0) {
      output.push(normalized);
    }

    return;
  }

  if (typeof value === "number") {
    output.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendClassValue(item, output);
    }

    return;
  }

  for (const [className, shouldInclude] of Object.entries(value)) {
    if (shouldInclude) {
      const normalized = className.trim();

      if (normalized.length > 0) {
        output.push(normalized);
      }
    }
  }
}

/**
 * Joins conditional className values into one stable string.
 *
 * Examples:
 * cn("base", condition && "active", { hidden: isHidden })
 * cn(["flex", "items-center"], { "opacity-50": disabled })
 */
export function cn(...values: UiClassValue[]): string {
  const output: string[] = [];

  for (const value of values) {
    appendClassValue(value, output);
  }

  return output.join(" ");
}

/**
 * Alias for cn() for places where "cx" reads better.
 */
export const cx = cn;

/**
 * Returns a boolean that is useful when composing optional UI slots.
 */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Keeps literal union values readable in component variant maps.
 */
export function pickUiVariant<TVariant extends string, TValue>(
  variant: TVariant | undefined,
  variants: Record<TVariant, TValue>,
  fallback: TVariant,
): TValue {
  if (variant && Object.prototype.hasOwnProperty.call(variants, variant)) {
    return variants[variant];
  }

  return variants[fallback];
}

/**
 * Clamps numeric UI values, for example progress percentage.
 */
export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
