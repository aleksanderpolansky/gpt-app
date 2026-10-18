// ARCTor ADM-5C.2 — deterministic, read-only planning quote. NOT an execution authorization.
// Reads active price snapshots through the existing AI Billing server reader (in the page).
export const ADM5C2_CONTRACT = "ARCTOR_ADM5C2_BUDGET_PLANNING_READ_ONLY_V1" as const;
export type PlanningPrice = {
  id: string; modelName: string; pricingCurrency: string;
  inputCostPer1mTokens: number; cachedInputCostPer1mTokens: number | null;
  outputCostPer1mTokens: number; usdToEurRate: number | null;
  eurMarkupMultiplier: number;
};
export type PlanningInputs = {
  inputMin: number; inputMax: number; systemOverhead: number;
  expectedOutput: number; safetyMultiplier: number; maxAttempts: number;
  capPerAttemptEur: number | null; capPerCaseEur: number | null;
};
export type PlanningQuote = {
  contract: typeof ADM5C2_CONTRACT;
  lowCostEur: number; highCostEur: number; guardedAttemptEur: number;
  guardedCaseEur: number; inputTokensLow: number; inputTokensHigh: number;
  attemptCapAssessment: "within_planned_cap" | "exceeds_planned_cap" | "not_supplied";
  caseCapAssessment: "within_planned_cap" | "exceeds_planned_cap" | "not_supplied";
  provisionalBudgetFits: boolean;
  pricingEvidenceId: string;
  pricingAssumptions: readonly string[];
  finalDisposition: "EXECUTION_FORBIDDEN";
  modelSelectionApproved: false; budgetReserved: false; outboundAuthorized: false;
  agentExecutionPermitted: false; dbWritesPerformed: false; modelCallsPerformed: false;
};
function finite(value: unknown, name: string, low: number, high: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < low || value > high)
    throw new Error(`INVALID_${name}`);
  return value;
}
const up6 = (v:number) => v <= 0 ? 0 : Math.ceil((v - 1e-14) * 1_000_000) / 1_000_000;
export function planAdminAiCostV1(price: PlanningPrice, values: PlanningInputs): PlanningQuote {
  if (!price || typeof price.id !== "string" || !price.id.trim() ||
      typeof price.modelName !== "string" || !price.modelName.trim()) throw new Error("INVALID_PRICE_ID");
  const unit = price.pricingCurrency.toUpperCase();
  if (unit !== "USD" && unit !== "EUR") throw new Error("UNSUPPORTED_CURRENCY");
  const inputCost = finite(price.inputCostPer1mTokens, "INPUT_PRICE", 0, 1000000);
  const outputCost = finite(price.outputCostPer1mTokens, "OUTPUT_PRICE", 0, 1000000);
  const markup = finite(price.eurMarkupMultiplier, "MARKUP", 0.00000001, 1000);
  const rate = unit === "USD" ? finite(price.usdToEurRate, "FX_RATE", 0.00000001, 1000) : 1;
  const min = finite(values.inputMin,"INPUT_MIN",0,10000000);
  const max = finite(values.inputMax,"INPUT_MAX",0,10000000);
  const overhead = finite(values.systemOverhead,"OVERHEAD",0,100000);
  const output = finite(values.expectedOutput,"OUTPUT_TOKENS",1,1000000);
  const safety = finite(values.safetyMultiplier,"SAFETY_MULTIPLIER",1,3);
  const attempts = finite(values.maxAttempts,"MAX_ATTEMPTS",1,20);
  if (![min,max,overhead,output,attempts].every(Number.isInteger) || min > max)
    throw new Error("INVALID_TOKEN_RANGE_OR_ATTEMPTS");
  for (const [k,v] of [["ATTEMPT_CAP",values.capPerAttemptEur],["CASE_CAP",values.capPerCaseEur]] as const) {
    if (v !== null) finite(v,k,0.000001,1000000);
  }
  const cost = (inputTokens:number) =>
    (inputTokens * inputCost + output * outputCost) * rate * markup / 1_000_000;
  const low = cost(min+overhead);
  const high = cost(max+overhead);
  const guardedAttempt = up6(high*safety);
  const guardedCase = up6(guardedAttempt*attempts);
  const assess = (cost:number, cap:number|null) => cap === null ? "not_supplied" :
    cost <= cap + 1e-12 ? "within_planned_cap" : "exceeds_planned_cap";
  const attempt = assess(guardedAttempt, values.capPerAttemptEur);
  const overall = assess(guardedCase, values.capPerCaseEur);
  return {
    contract: ADM5C2_CONTRACT,
    lowCostEur: Math.round(low*1e8)/1e8, highCostEur: Math.round(high*1e8)/1e8,
    guardedAttemptEur: guardedAttempt, guardedCaseEur: guardedCase,
    inputTokensLow:min+overhead, inputTokensHigh:max+overhead,
    attemptCapAssessment:attempt,caseCapAssessment:overall,
    provisionalBudgetFits:attempt==="within_planned_cap"&&overall==="within_planned_cap",
    pricingEvidenceId: price.id,
    pricingAssumptions:[
      "Only active DB price snapshot; vendor price and model availability not independently rechecked",
      "Assumes zero cached input tokens; no provider tokenizer or actual metering",
      "Output and system overhead are estimates; safety factor is administrator scenario input",
      "USD converted using price snapshot FX and markup, when applicable",
      "Wallet, account ownership, per-task model grant and actual reserve are NOT checked",
    ],
    finalDisposition:"EXECUTION_FORBIDDEN",
    modelSelectionApproved:false,budgetReserved:false,outboundAuthorized:false,
    agentExecutionPermitted:false,dbWritesPerformed:false,modelCallsPerformed:false,
  };
}
