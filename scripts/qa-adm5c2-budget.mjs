import assert from "node:assert/strict";
import {planAdminAiCostV1} from "../src/lib/admin-execution/budgetQuoteV1.ts";
const price={id:"price-1",modelName:"TEST_ONLY",pricingCurrency:"USD",inputCostPer1mTokens:1,cachedInputCostPer1mTokens:null,outputCostPer1mTokens:2,usdToEurRate:1,eurMarkupMultiplier:1};
const args={inputMin:247,inputMax:617,systemOverhead:100,expectedOutput:500,safetyMultiplier:1.25,maxAttempts:2,capPerAttemptEur:0.01,capPerCaseEur:0.02};
const q=planAdminAiCostV1(price,args);
assert.equal(q.lowCostEur,0.001347);
assert.equal(q.highCostEur,0.001717);
assert.equal(q.guardedAttemptEur,0.002147);
assert.equal(q.guardedCaseEur,0.004294);
assert.equal(q.attemptCapAssessment,"within_planned_cap");
assert.equal(q.caseCapAssessment,"within_planned_cap");
assert.equal(q.provisionalBudgetFits,true);
for(const [k,v] of Object.entries({modelSelectionApproved:false,budgetReserved:false,outboundAuthorized:false,agentExecutionPermitted:false,dbWritesPerformed:false,modelCallsPerformed:false})) assert.equal(q[k],v);
assert.equal(q.finalDisposition,"EXECUTION_FORBIDDEN");
const missing=planAdminAiCostV1(price,{...args,capPerAttemptEur:null,capPerCaseEur:null});
assert.equal(missing.provisionalBudgetFits,false);
assert.equal(missing.attemptCapAssessment,"not_supplied");
assert.equal(planAdminAiCostV1(price,{...args,capPerAttemptEur:0.00001}).attemptCapAssessment,"exceeds_planned_cap");
assert.equal(planAdminAiCostV1(price,{...args,capPerCaseEur:0.00001}).caseCapAssessment,"exceeds_planned_cap");
assert.equal(planAdminAiCostV1({...price,pricingCurrency:"EUR",usdToEurRate:null},args).highCostEur,0.001717);
assert.equal(planAdminAiCostV1({...price,usdToEurRate:0.5,eurMarkupMultiplier:2},args).highCostEur,0.001717);
assert.throws(()=>planAdminAiCostV1({...price,usdToEurRate:null},args),/INVALID_FX_RATE/);
assert.throws(()=>planAdminAiCostV1({...price,pricingCurrency:"RUB"},args),/UNSUPPORTED_CURRENCY/);
assert.throws(()=>planAdminAiCostV1({...price,id:""},args),/INVALID_PRICE_ID/);
for(const bad of [
  {inputMin:700},{inputMax:-1},{systemOverhead:-1},{expectedOutput:0},
  {safetyMultiplier:0.5},{safetyMultiplier:4},{maxAttempts:0},{maxAttempts:21},
  {capPerAttemptEur:0},{capPerCaseEur:NaN},{inputMin:1.5},{maxAttempts:2.5},
  {inputMax:Infinity},{systemOverhead:100001},{expectedOutput:1000001},
]) assert.throws(()=>planAdminAiCostV1(price,{...args,...bad}));
for(const bad of [
  {inputCostPer1mTokens:-1},{outputCostPer1mTokens:NaN},
  {eurMarkupMultiplier:0},{pricingCurrency:""},
]) assert.throws(()=>planAdminAiCostV1({...price,...bad},args));
const zero=planAdminAiCostV1({...price,inputCostPer1mTokens:0,outputCostPer1mTokens:0},args);
assert.equal(zero.guardedAttemptEur,0);
assert.equal(zero.finalDisposition,"EXECUTION_FORBIDDEN");
console.log("ARCTOR_ADM5C2_PURE_QA_PASS_35_CHECKS");
