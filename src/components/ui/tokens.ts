/**
 * ARCTor.app / AI-NAVIGATOR
 * UI-2.4 — project-local design tokens
 *
 * Source: High-Fidelity Dashboard Design / ARCTor.app dashboard shell.
 *
 * Boundary:
 * - No runtime logic.
 * - No package dependencies.
 * - No imports.
 * - No Tailwind config changes.
 * - No global CSS changes.
 *
 * These tokens are intentionally local to src/components/ui/.
 * Future UI primitives should import tokens from this file instead of
 * duplicating raw Figma values across components.
 */

export const UI_TOKENS_VERSION = "UI-2.4_FIGMA_REFERENCE_TOKENS_V1" as const;

export const uiColors = {
  background: "#f0f2f7",
  foreground: "#1a1d2e",

  card: "#ffffff",
  cardForeground: "#1a1d2e",

  primary: "#3b6ef8",
  primaryForeground: "#ffffff",

  secondary: "#eef2ff",
  secondaryForeground: "#3b6ef8",

  muted: "#f0f2f7",
  mutedForeground: "#7c8099",

  accent: "#eef2ff",
  accentForeground: "#3b6ef8",

  inputBackground: "#f5f6fb",
  placeholder: "#b0b4c8",

  borderSoft: "rgba(0,0,0,0.06)",
  borderMedium: "rgba(0,0,0,0.07)",
  borderStrong: "rgba(0,0,0,0.08)",

  success: "#22c55e",
  violet: "#8b5cf6",
  orange: "#f97316",
  cyan: "#06b6d4",
  danger: "#ef4444",

  gradientPrimaryFrom: "#3b6ef8",
  gradientPrimaryTo: "#6f42f5",

  chart1: "#3b6ef8",
  chart2: "#22c55e",
  chart3: "#8b5cf6",
  chart4: "#f97316",
  chart5: "#06b6d4",
} as const;

export const uiSemanticColors = {
  candidate: {
    text: "#3b6ef8",
    background: "#eef2ff",
    border: "rgba(59,110,248,0.18)",
  },
  suggested: {
    text: "#8b5cf6",
    background: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.18)",
  },
  confirmed: {
    text: "#22c55e",
    background: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.18)",
  },
  rejected: {
    text: "#ef4444",
    background: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.18)",
  },
  needsReview: {
    text: "#f97316",
    background: "rgba(249,115,22,0.10)",
    border: "rgba(249,115,22,0.18)",
  },
  externalHint: {
    text: "#06b6d4",
    background: "rgba(6,182,212,0.10)",
    border: "rgba(6,182,212,0.18)",
  },
  stateSignal: {
    text: "#7c8099",
    background: "#f0f2f7",
    border: "rgba(0,0,0,0.06)",
  },
} as const;

export const uiRadius = {
  sm: "0.5rem",
  md: "0.625rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
  full: "9999px",
} as const;

export const uiShadow = {
  none: "none",
  sm: "0 1px 2px rgba(15,23,42,0.04)",
  card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  panel: "0 8px 24px rgba(15,23,42,0.06)",
} as const;

export const uiTypography = {
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  baseSize: "14px",

  size: {
    xs: "10px",
    sm: "11px",
    md: "12.5px",
    base: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "22px",
  },

  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: "1.15",
    normal: "1.4",
    relaxed: "1.6",
  },
} as const;

export const uiSpacing = {
  px: "1px",
  0: "0",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
} as const;

export const uiShell = {
  topBarHeight: "56px",
  sidebarWidth: "240px",
  aiPanelWidth: "292px",

  desktopColumns: {
    left: "20%",
    center: "45%",
    right: "35%",
  },
} as const;

export const uiComponentSize = {
  icon: {
    xs: "14px",
    sm: "16px",
    md: "20px",
    lg: "24px",
  },

  iconBox: {
    sm: "28px",
    md: "32px",
    lg: "40px",
  },

  avatar: {
    sm: "28px",
    md: "32px",
    lg: "40px",
  },

  buttonHeight: {
    sm: "32px",
    md: "36px",
    lg: "40px",
    icon: "32px",
  },

  progressRing: {
    sm: 48,
    md: 64,
    lg: 80,
  },
} as const;

export const uiZIndex = {
  base: 0,
  sticky: 10,
  dropdown: 20,
  modal: 50,
  toast: 60,
} as const;

export const uiMotion = {
  transitionFast: "150ms ease",
  transitionNormal: "200ms ease",
  transitionSlow: "300ms ease",
} as const;

export const uiTokens = {
  version: UI_TOKENS_VERSION,
  colors: uiColors,
  semanticColors: uiSemanticColors,
  radius: uiRadius,
  shadow: uiShadow,
  typography: uiTypography,
  spacing: uiSpacing,
  shell: uiShell,
  componentSize: uiComponentSize,
  zIndex: uiZIndex,
  motion: uiMotion,
} as const;

export type UiTokens = typeof uiTokens;
export type UiColorName = keyof typeof uiColors;
export type UiSemanticColorName = keyof typeof uiSemanticColors;
export type UiRadiusName = keyof typeof uiRadius;
export type UiShadowName = keyof typeof uiShadow;
