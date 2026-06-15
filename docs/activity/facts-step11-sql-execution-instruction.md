# GPT-APP / AI-NAVIGATOR — FACTS STEP 11/12

## SQL execution instruction

Gate phrase received:

FACTS_ACTIVITY_FACTS_SQL_EXECUTION_APPROVED

## 1. Migration to execute

supabase\migrations\20260615135403_activity_facts_persistence_layer.sql

## 2. Execution method

Use Supabase Dashboard → SQL Editor.

1. Paste the migration SQL from clipboard.
2. Run once.
3. If Supabase returns an error, stop and upload the error text.
4. If Supabase succeeds, run the post-execution verification SQL:

docs/sql/FACTS_STEP11_post_execution_verification.sql

5. Export or copy the verification output into:

FACTS_STEP11_POST_EXECUTION_VERIFY_OUTPUT_YYYYMMDD_HHMMSS.txt

6. Upload that file to ChatGPT.

## 3. Safety

This PowerShell script did not execute SQL automatically.
Actual execution happens only when you press Run in Supabase SQL Editor.