-- P4.8.0-D4.3
-- Corrective migration for obsolete purchase_confirmations.currency.
--
-- Reason:
-- Migration 025 historically introduced public.purchase_confirmations.currency,
-- but live RPC inspection confirmed that the active runtime/business field is
-- public.purchase_confirmations.purchase_currency.
--
-- Current live DB state at inspection:
-- - has_purchase_currency = true
-- - has_currency = false
--
-- This migration is intentionally safe and idempotent:
-- - if currency does not exist, it does nothing;
-- - if an older/new reset environment creates currency from migration 025,
--   this migration removes it again.
--
-- Do not reintroduce public.purchase_confirmations.currency.
-- Keep public.purchase_confirmations.purchase_currency as the active field.

alter table if exists public.purchase_confirmations
  drop constraint if exists purchase_confirmations_currency_check;

alter table if exists public.purchase_confirmations
  drop column if exists currency;

comment on column public.purchase_confirmations.purchase_currency is
  'Active runtime/business currency for external purchase confirmations. Resolved by RPC from p_purchase_currency -> organization.default_currency -> PLN. Do not reintroduce purchase_confirmations.currency.';
