export type MobileTabKey = "ai" | "workspace" | "objects" | "calendar" | "actions";

export type MobilePreviewStatus =
  | "read_only"
  | "preview_only"
  | "signal"
  | "needs_review"
  | "no_rights"
  | "future_gated";

export type MobileBadgeTone =
  | "default"
  | "primary"
  | "muted"
  | "warning"
  | "success";

export type MobileActionKind =
  | "open_route"
  | "open_tab"
  | "preview"
  | "disabled"
  | "future_gate";

export type MobilePanelSource =
  | "ui16_fixture"
  | "ui15_contextual_ai"
  | "existing_read_only_route"
  | "future_ui17_preview";

export type MobileRouteTarget = {
  readonly href: string;
  readonly label: string;
  readonly description?: string;
};

export type MobileBadge = {
  readonly label: string;
  readonly tone: MobileBadgeTone;
  readonly status?: MobilePreviewStatus;
};

export type MobileTabItem = {
  readonly key: MobileTabKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly ariaLabel: string;
  readonly description: string;
  readonly status: MobilePreviewStatus;
  readonly routeTarget?: MobileRouteTarget;
};

export type MobilePanelMetric = {
  readonly label: string;
  readonly value: string;
  readonly helperText?: string;
  readonly status?: MobilePreviewStatus;
};

export type MobilePanelSection = {
  readonly title: string;
  readonly body: string;
  readonly badges?: readonly MobileBadge[];
  readonly metrics?: readonly MobilePanelMetric[];
};

export type MobilePanelPreview = {
  readonly tabKey: MobileTabKey;
  readonly title: string;
  readonly subtitle: string;
  readonly contextLabel: string;
  readonly status: MobilePreviewStatus;
  readonly source: MobilePanelSource;
  readonly sections: readonly MobilePanelSection[];
  readonly primaryRoute?: MobileRouteTarget;
  readonly helperText?: string;
};

export type MobileActionCandidate = {
  readonly id: string;
  readonly tabKey: MobileTabKey;
  readonly title: string;
  readonly description: string;
  readonly kind: MobileActionKind;
  readonly status: MobilePreviewStatus;
  readonly durationLabel?: string;
  readonly energyLabel?: string;
  readonly placeLabel?: string;
  readonly routeTarget?: MobileRouteTarget;
  readonly badges?: readonly MobileBadge[];
  readonly disabledReason?: string;
};

export type MobileHeaderContext = {
  readonly activeTabKey: MobileTabKey;
  readonly title: string;
  readonly contextBadge: MobileBadge;
  readonly readOnlyLabel: string;
};

export type MobileShellPreviewState = {
  readonly tabs: readonly MobileTabItem[];
  readonly activeTabKey: MobileTabKey;
  readonly header: MobileHeaderContext;
  readonly panels: Record<MobileTabKey, MobilePanelPreview>;
  readonly actions: readonly MobileActionCandidate[];
};

export type MobileTabSelectionResult = {
  readonly requestedTabKey: string | null;
  readonly selectedTabKey: MobileTabKey;
  readonly fallbackUsed: boolean;
};
