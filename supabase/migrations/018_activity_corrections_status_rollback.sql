alter table public.activity_corrections
drop constraint if exists activity_corrections_correction_type_check;

alter table public.activity_corrections
add constraint activity_corrections_correction_type_check
check (
  correction_type in (
    'timing_correction',
    'duration_correction',
    'comment_correction',
    'manual_patch',
    'status_rollback'
  )
);
