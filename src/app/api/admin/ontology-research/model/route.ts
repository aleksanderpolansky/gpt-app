import {Buffer} from "node:buffer";
import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {platformAdminErrorResponse,requirePlatformAdmin} from "@/lib/admin/require-platform-admin";
import {ONTO_AI_PILOT_CONTRACT,ONTO_RESULT_SCHEMA,ONTO_SYSTEM,validLocale,validStage} from "@/lib/ontology-research/ontologyResearchV1";
import {buildIntakePrompt,ONTO_INTAKE_SCHEMA} from "@/lib/ontology-research/intakeBriefV61";
import {buildReviewPrompt,ONTO_REVIEW_SCHEMA,type ReviewKind} from "@/lib/ontology-research/reviewV61";
import {getNavigatorModelDefinition} from "../../../../../../lib/ai/navigatorModelCatalog";
import {readActiveModelPriceSnapshot,calculateAiUsageCostEur,readAiWalletAccess} from "@/lib/ai-billing/runtime";
import {runBillableAiJson} from "@/lib/ai-billing/gateway.server";

export const runtime="nodejs";
const H={"Cache-Control":"private, no-store, max-age=0",Vary:"Cookie","X-Content-Type-Options":"nosniff"};
const SCHEMA_NAME="arctor_onto_ai_pilot_research_v1";
const MAX_INPUT_TOKENS=24000;
const BASE_OUTPUT_TOKENS=1100;
const DESIGN_OUTPUT_TOKENS=3500;
const MAX_QUOTE_EUR=0.025;
const ROUTE="/api/admin/ontology-research/model";
type Payload={mode:"quote"|"run";prompt:string;locale:string;stage:string;
  intakeTopic?:string;reviewKind?:ReviewKind;reviewOriginalPrompt?:string;reviewAnswer?:string;
  quoteHash?:string;approvedMaxEur?:number;operationId?:string};
function failure(errorCode:string,status=400){return NextResponse.json({ok:false,contract:ONTO_AI_PILOT_CONTRACT,errorCode},{status,headers:H});}
function validPayload(value:unknown):value is Payload {
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  if((v.mode!=="quote"&&v.mode!=="run")||!validLocale(v.locale)||
     typeof v.prompt!=="string"||v.prompt.length<30||v.prompt.length>24000)return false;
  if(v.stage==="intake"){
    if(typeof v.intakeTopic!=="string"||v.intakeTopic.length<2||v.intakeTopic.length>180)return false;
    try{return buildIntakePrompt(v.intakeTopic,v.locale)===v.prompt;}catch{return false;}
  }
  if(v.stage==="review"){
    if((v.reviewKind!=="intake"&&v.reviewKind!=="research")||
      typeof v.reviewOriginalPrompt!=="string"||typeof v.reviewAnswer!=="string")return false;
    try{return buildReviewPrompt({locale:v.locale,kind:v.reviewKind,
      originalPrompt:v.reviewOriginalPrompt,answer:v.reviewAnswer})===v.prompt;}
    catch{return false;}
  }
  return validStage(v.stage)&&v.prompt.includes("CURRENT STAGE: "+v.stage)&&
    v.prompt.includes("Output only a JSON object");
}
export async function POST(request:Request){
  const guard=await requirePlatformAdmin({allowedRoles:["owner","admin"]});
  if(!guard.ok)return platformAdminErrorResponse(guard,ONTO_AI_PILOT_CONTRACT);
  if(request.headers.get("origin")!==new URL(request.url).origin)return failure("ORIGIN_REQUIRED",403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))return failure("JSON_REQUIRED",415);
  const input:unknown=await request.json().catch(()=>null);
  if(!validPayload(input))return failure("INVALID_RESEARCH_REQUEST");
  const outputTokens=input.stage==="design"||input.stage==="critique"?DESIGN_OUTPUT_TOKENS:
    input.stage==="intake"?2600:BASE_OUTPUT_TOKENS;
  const model=getNavigatorModelDefinition("nano");
  if(!model?.modelName||model.tierCode!=="nano")return failure("NANO_MODEL_UNAVAILABLE",503);
  const selectedSchema=input.stage==="intake"?ONTO_INTAKE_SCHEMA:
    input.stage==="review"?ONTO_REVIEW_SCHEMA:ONTO_RESULT_SCHEMA;
  const schema={name:input.stage==="intake"?"arctor_onto_ai_intake_v61":
    input.stage==="review"?"arctor_onto_ai_review_v61":SCHEMA_NAME,
    schema:selectedSchema,strict:true};
  const serialized=ONTO_SYSTEM+input.prompt+JSON.stringify(schema);
  const inputTokens=Buffer.byteLength(serialized,"utf8")+500; // conservative reserve upper bound for UTF-8 tokenization
  if(inputTokens>MAX_INPUT_TOKENS)return failure("RESEARCH_CONTEXT_TOO_LARGE",413);
  try{
    const price=await readActiveModelPriceSnapshot({modelName:model.modelName,tierCode:"nano"});
    const estimated=calculateAiUsageCostEur({usage:{inputTokens,cachedInputTokens:0,outputTokens,totalTokens:inputTokens+outputTokens},price});
    const maxEur=Math.ceil(estimated*1.25*1_000_000)/1_000_000;
    if(!Number.isFinite(maxEur)||maxEur<=0||maxEur>MAX_QUOTE_EUR)return failure("MODEL_ESTIMATE_EXCEEDS_PILOT_CAP",409);
    const quoteHash=createHash("sha256").update(JSON.stringify({contract:ONTO_AI_PILOT_CONTRACT,
      billingUserId:guard.appUser.id,stage:input.stage,locale:input.locale,
      promptHash:createHash("sha256").update(input.prompt).digest("hex"),priceId:price.id,
      model:model.modelName,inputTokens,maxEur})).digest("hex");
    const wallet=await readAiWalletAccess(guard.appUser.id);
    const affordable=wallet.status==="active"&&wallet.currency==="EUR"&&wallet.availableEur>=maxEur;
    if(input.mode==="quote")return NextResponse.json({ok:true,contract:ONTO_AI_PILOT_CONTRACT,mode:"quote",
      modelName:model.modelName,estimatedMaxEur:maxEur,canAfford:affordable,
      availableEur:wallet.availableEur,quoteHash,aiCallsPerformed:false,dbWritesPerformed:false},{headers:H});
    if(!input.operationId||!/^onto-ai:[0-9a-f-]{36}$/i.test(input.operationId)||
      input.quoteHash!==quoteHash||input.approvedMaxEur!==maxEur)return failure("EXPLICIT_VALID_QUOTE_REQUIRED",409);
    if(!affordable)return failure("INSUFFICIENT_AI_WALLET",402);
    const output=await runBillableAiJson({
      billingUserId:guard.appUser.id,requestIdempotencyKey:`onto-ai-pilot:${input.operationId}`,
      routePath:ROUTE,operationKind:"other",modelName:model.modelName,tierCode:"nano",
      estimatedInputTokens:inputTokens,estimatedOutputTokens:outputTokens,
      preflightSafetyMultiplier:1.25,
      providerRequest:{system:ONTO_SYSTEM,user:input.prompt,structuredOutput:schema,
        maxOutputTokens:outputTokens,outputTokenCeiling:outputTokens,requestTimeoutMs:30000,maxRetries:0,store:false},
      reason:"Explicitly approved ON-only ontology research or independent review",
      requestMetadata:{contract:ONTO_AI_PILOT_CONTRACT,stage:input.stage,locale:input.locale,
        explicitApproval:true,writeOntologies:false},
    });
    return NextResponse.json({ok:true,contract:ONTO_AI_PILOT_CONTRACT,mode:"run",
      answer:output.outputText,parsed:output.parsed,
      billedEur:output.billing.walletDebitEur,usageEventId:output.billing.usageEventId,
      noOntologyWrites:true},{headers:H});
  }catch(error){
    console.error("ONTO_AI_MODEL_FAILED",error instanceof Error?error.name:"UNKNOWN");
    return failure("MODEL_OR_BILLING_GATEWAY_FAILED",503);
  }
}
