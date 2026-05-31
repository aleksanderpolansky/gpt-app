# C33-L.2 — Sandbox fixture retention vs cleanup policy

Date: 2026-05-31  
Project: gpt-app / AI-NAVIGATOR  
Block status: C33-L.2 policy checkpoint.

---

## 1. Decision

Default decision:

```text
KEEP THE C33-K.4R SANDBOX STABLE BUNDLE FIXTURE FOR NOW.
```

No cleanup is executed in C33-L.2.

The fixture remains useful as a known post-write verification anchor for C33-K.5 and later regression checks.

---

## 2. Fixture identity

Stable bundle ID:

```text
87067c54-f8b3-46e7-8451-69e28bc9a69b
```

Sandbox run key:

```text
c33-k4-sandbox-20260531101917
```

Origin:

```text
C33-K.4R explicit sandbox stable bundle write gate
```

Final verification:

```text
C33-K.5R post-write verification / final lock
```

Relevant commits:

| Commit | Meaning |
|---|---|
| `4c10503` | explicit sandbox stable bundle write gate |
| `455257a` | stable bundle post-write verification |
| `b7ee0f1` | C33-L integration / hardening checkpoint |

---

## 3. Verified fixture shape

The fixture has the following verified shape:

| Area | Count |
|---|---:|
| stable_semantic_bundles | 1 |
| stable_semantic_bundle_members | 5 |
| stable_semantic_bundle_blocked_audit_items | 0 |
| stable_semantic_bundle_source_snapshots | 1 |
| stable_semantic_bundle_resolver_snapshots | 1 |
| Total verified rows | 8 |

Status:

```text
bundle_status = test_preview
is_sandbox_test = true
```

The fixture is not production content.

---

## 4. Why retention is safer now

The fixture should be retained because:

1. It proves that the stable semantic bundle schema can persist a real sandbox bundle.
2. It proves that the post-write verification route can read the five stable bundle tables.
3. It proves idempotency: duplicate retry with the same sandbox run key writes zero new rows.
4. It gives future C33-L checks a known stable anchor.
5. Deleting it now would remove the only verified post-write fixture before a reproducible fixture lifecycle exists.

---

## 5. Cleanup is not forbidden, but it must be gated

Cleanup may be implemented later, but only through a separate explicit gate.

Cleanup must not be hidden inside:

- normal page load;
- semantic preview;
- next action preview;
- activity capture;
- post-write verification;
- C33-L.2 documentation step.

Cleanup requires its own future step, likely:

```text
C33-L.x — explicit sandbox fixture cleanup gate
```

That future step must have:

1. exact typed confirmation;
2. service-role server-side only route or manual SQL packet;
3. sandbox-only guard;
4. exact stableBundleId and sandboxRunKey match;
5. dry-run mode first;
6. SELECT-before-delete verification;
7. DELETE only from the five stable semantic bundle fixture tables;
8. no state / Value Object / Activity Event / activity-value-object link deletion;
9. post-delete verification;
10. commit/push only after passing checks.

---

## 6. Preferred cleanup order if cleanup is later executed

If cleanup is later implemented, delete child rows before header row:

1. `stable_semantic_bundle_resolver_snapshots`
2. `stable_semantic_bundle_source_snapshots`
3. `stable_semantic_bundle_blocked_audit_items`
4. `stable_semantic_bundle_members`
5. `stable_semantic_bundles`

Do not use a broad delete by `is_sandbox_test = true` alone.

The safe selector must include both:

```text
stableBundleId = 87067c54-f8b3-46e7-8451-69e28bc9a69b
sandboxRunKey = c33-k4-sandbox-20260531101917
```

For the header row, the sandboxRunKey is verified through the `idempotency_key` containing the run key.

---

## 7. What must not be cleaned by this fixture policy

This policy does not authorize deleting or mutating:

- Activity Events;
- Value Objects;
- Activity Value Object links;
- State Facts;
- State Deltas;
- State Snapshots;
- category tables;
- resolver candidate tables;
- unknown/external concept candidate tables;
- user data;
- production data.

---

## 8. C33-L.2 result

C33-L.2 is a documentation-only policy step.

Expected result:

```text
C33-L.2 RESULT: SANDBOX_FIXTURE_RETENTION_POLICY_COMMITTED_AND_PUSHED
```

No SQL execution.  
No DB read.  
No DB write.  
No route creation.  
No runtime behavior change.

---

## 9. Next recommended step

Proceed to:

```text
C33-L.3 — internal stable semantic bundle service wrapper design
```

Purpose of C33-L.3:

- design a non-debug application service wrapper;
- keep it server-side only;
- keep production writes disabled by default;
- keep Activity Event linkage separate;
- keep Value Object creation separate and user-confirmed;
- keep the existing debug routes as QA tools, not normal product API.

