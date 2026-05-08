export const OPENAI_DEFAULT_MODEL =
  process.env.OPENAI_DEFAULT_MODEL || "gpt-5-nano";

export const OPENAI_MAX_OUTPUT_TOKENS = Number(
  process.env.OPENAI_MAX_OUTPUT_TOKENS || "300"
);

export const OPENAI_TEMPERATURE = Number(
  process.env.OPENAI_TEMPERATURE || "0.2"
);

export const AI_ENABLED = process.env.AI_ENABLED !== "false";

export const AI_ADMIN_ONLY = process.env.AI_ADMIN_ONLY !== "false";