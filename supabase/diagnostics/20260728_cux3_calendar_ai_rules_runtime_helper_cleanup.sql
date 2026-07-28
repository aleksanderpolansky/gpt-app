-- ARCTor.app CUX3 runtime acceptance helper cleanup.
-- Run only after the V2 acceptance result has been captured.

drop function if exists public.cux3_runtime_acceptance_v2();
