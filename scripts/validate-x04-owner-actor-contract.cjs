#!/usr/bin/env node
'use strict';
/**
 * ARCTor X04-012: source-level regression guard for owner/actor identity.
 * READ ONLY: does not call Supabase, does not inspect .env, does not modify the repository.
 * This is a source contract check, NOT a runtime Auth0 or SQL RPC security proof.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const SOURCES = Object.freeze({
  context: 'lib/actor-context.ts',
  product: 'src/app/api/value-objects/product-service/route.ts',
  offer: 'src/app/api/offers/route.ts',
  publication: 'src/app/api/publications/route.ts',
});

const RULES = Object.freeze([
  ['CONTEXT_AUTH0_USER', 'context', /\.eq\(\s*["']auth0_sub["']\s*,\s*auth0Sub\s*\)/],
  ['CONTEXT_PROFILES_OWNED_BY_USER', 'context', /\.eq\(\s*["']owner_user_id["']\s*,\s*appUser\.id\s*\)/],
  ['CONTEXT_PROFILE_SELECTION_OWNED', 'context', /validProfiles\.find\(\s*\(profile\)\s*=>\s*profile\.id\s*===\s*requestedProfileId\s*\)/],
  ['CONTEXT_ACTOR_LINKED_TO_PROFILE', 'context', /actorIds\s*=\s*\[\.\.\.new Set\(ownedProfiles\.map\(\(profile\)\s*=>\s*profile\.actor_id\)\)\]/],
  ['PRODUCT_AUTH0_SESSION', 'product', /auth0\.getSession\(\)/],
  ['PRODUCT_RESOLVES_ACTOR', 'product', /resolveActiveActorContext\(session\.user\.sub\)/],
  ['PRODUCT_ORGANIZATION_OWNED_BY_ACTOR', 'product', /\.eq\(\s*["']owner_actor_id["']\s*,\s*actorContext\.actorId\s*\)/],
  ['PRODUCT_RPC_IS_CANONICAL', 'product', /supabase\.rpc\(\s*["']create_product_service_leaf_v1["']/],
  ['PRODUCT_RPC_OWNER_FROM_SERVER', 'product', /p_owner_user_id\s*:\s*actorContext\.appUserId\s*,/],
  ['PRODUCT_RPC_ACTOR_FROM_SERVER', 'product', /p_owner_actor_id\s*:\s*actorContext\.actorId\s*,/],
  ['PRODUCT_RPC_ORG_FROM_VALIDATED_CONTEXT', 'product', /p_organization_id\s*:\s*organizationId\s*,/],
  ['OFFER_AUTH0_ACTOR', 'offer', /resolveActiveActorContext\(session\.user\.sub\)/],
  ['OFFER_ORGANIZATION_OWNER_FILTER', 'offer', /\.eq\(\s*["']owner_actor_id["']\s*,\s*actorId\s*\)/],
  ['OFFER_VALUE_OBJECT_OWNER_USER', 'offer', /\.eq\(\s*["']owner_user_id["']\s*,\s*appUserId\s*\)/],
  ['OFFER_VALUE_OBJECT_OWNER_ACTOR', 'offer', /\.eq\(\s*["']owner_actor_id["']\s*,\s*personActorId\s*\)/],
  ['PUBLICATION_AUTHOR_ALLOWED_FOR_USER', 'publication', /getPublicationAuthorOptionForUser\(\s*\{\s*ownerUserId:\s*actorContext\.appUserId\s*,\s*authorActorId\s*,?\s*\}\s*\)/],
  ['PUBLICATION_OWNER_FROM_SERVER', 'publication', /p_owner_user_id\s*:\s*actorContext\.appUserId\s*,/],
  ['PUBLICATION_CREATOR_ACTOR_FROM_SERVER', 'publication', /p_created_by_actor_id\s*:\s*actorContext\.actorId\s*,/],
  ['PUBLICATION_AUTHOR_SEPARATE', 'publication', /p_author_actor_id\s*:\s*author\.actorId\s*,/],
]);

function check(sources) {
  const failures = [];
  const passed = [];
  for (const [name, source, pattern] of RULES) {
    if (pattern.test(sources[source] || '')) passed.push(name);
    else failures.push(name);
  }
  // Enforce that request payload cannot override the canonical owner/actor RPC args.
  const product = sources.product || '';
  for (const [name, rx] of [
    ['PRODUCT_USER_OVERRIDE_FROM_BODY', /p_owner_user_id\s*:\s*(?:body|request|input|payload)\./],
    ['PRODUCT_ACTOR_OVERRIDE_FROM_BODY', /p_owner_actor_id\s*:\s*(?:body|request|input|payload)\./],
  ]) {
    if (rx.test(product)) failures.push(name);
    else passed.push('NO_' + name);
  }
  return { passed, failures };
}

function selfTest() {
  const examples = Object.fromEntries(Object.keys(SOURCES).map(name => [name, '']));
  for (const [, source, pattern] of RULES) {
    // Source-independent regex tests are supplemented by actual repository checks.
    assert.ok(pattern instanceof RegExp);
    assert.ok(source in examples);
  }
  let samples = {
    product: 'p_owner_user_id: actorContext.appUserId, p_owner_actor_id: actorContext.actorId,',
    offer: '', context: '', publication: '',
  };
  assert.ok(!check(samples).failures.includes('PRODUCT_RPC_OWNER_FROM_SERVER'));
  samples.product = 'p_owner_user_id: body.owner_user_id, p_owner_actor_id: body.owner_actor_id,';
  assert.ok(check(samples).failures.includes('PRODUCT_RPC_OWNER_FROM_SERVER'));
  assert.ok(check(samples).failures.includes('PRODUCT_USER_OVERRIDE_FROM_BODY'));
  assert.ok(check(samples).failures.includes('PRODUCT_ACTOR_OVERRIDE_FROM_BODY'));
  console.log('X04_012_OWNER_ACTOR_GUARD_SELFTEST_PASS');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) { selfTest(); return; }
  const rootIndex = args.indexOf('--root');
  const root = path.resolve(rootIndex >= 0 ? (args[rootIndex + 1] || '.') : '.');
  const sources = {};
  for (const [kind, relative] of Object.entries(SOURCES)) {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) {
      console.error(`STOP: MISSING_SOURCE_FILE: ${relative}`);
      process.exitCode = 2;
      return;
    }
    sources[kind] = fs.readFileSync(full, 'utf8');
  }
  const result = check(sources);
  for (const name of result.passed) console.log('PASS ' + name);
  for (const name of result.failures) console.error('FAIL ' + name);
  console.log(`X04_012_OWNER_ACTOR_STATIC_CHECK ${result.passed.length} PASS / ${result.failures.length} FAIL`);
  console.log('LIMITATION: Source patterns only. DB RPC, runtime A/B isolation and SEC-06 NOT proved.');
  if (result.failures.length) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { check, RULES };
