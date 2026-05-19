export type ValueObjectCloudDebugAccess = {
  allowed: boolean;
  nodeEnv: string;
  vercelEnv: string | null;
  flagName: "VALUE_OBJECT_CLOUD_DEBUG_ENABLED";
  flagEnabled: boolean;
  reason: string;
};

export function getValueObjectCloudDebugAccess(): ValueObjectCloudDebugAccess {
  const nodeEnv = process.env.NODE_ENV ?? "unknown";
  const vercelEnv = process.env.VERCEL_ENV ?? null;
  const flagEnabled = process.env.VALUE_OBJECT_CLOUD_DEBUG_ENABLED === "true";

  if (nodeEnv !== "production") {
    return {
      allowed: true,
      nodeEnv,
      vercelEnv,
      flagName: "VALUE_OBJECT_CLOUD_DEBUG_ENABLED",
      flagEnabled,
      reason: "Allowed because NODE_ENV is not production.",
    };
  }

  if (flagEnabled) {
    return {
      allowed: true,
      nodeEnv,
      vercelEnv,
      flagName: "VALUE_OBJECT_CLOUD_DEBUG_ENABLED",
      flagEnabled,
      reason:
        "Allowed because VALUE_OBJECT_CLOUD_DEBUG_ENABLED is explicitly true.",
    };
  }

  return {
    allowed: false,
    nodeEnv,
    vercelEnv,
    flagName: "VALUE_OBJECT_CLOUD_DEBUG_ENABLED",
    flagEnabled,
    reason:
      "Blocked because NODE_ENV is production and VALUE_OBJECT_CLOUD_DEBUG_ENABLED is not true.",
  };
}
