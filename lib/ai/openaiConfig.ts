import { getNavigatorModelDefinition } from "./navigatorModelCatalog";

export const OPENAI_DEFAULT_MODEL =
  getNavigatorModelDefinition("nano").modelName;

export const OPENAI_MAX_OUTPUT_TOKENS = 800;

export const OPENAI_TEMPERATURE = 0.2;

export const AI_ENABLED = process.env.AI_ENABLED !== "false";

export const AI_ADMIN_ONLY = process.env.AI_ADMIN_ONLY !== "false";
