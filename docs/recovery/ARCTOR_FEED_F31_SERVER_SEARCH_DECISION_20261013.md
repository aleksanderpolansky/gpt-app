# ARCTor F3.1A — recovery/decision note

Date: 2026-10-13. Baseline HEAD: cb57b6450f024c57c7b1896ac047e06c5f9ba150.

F3.0 capacity planner estimates: message_objects ~55; activity_object_facts ~65; value_objects ~725; message_object_relations -1 indicates unknown planner estimate, **not negative actual rows**. Existing index on message_object_relations starts with `message_object_id`; reverse lookup needs an index on target_value_object_id.

Scope: SQL-only new server search function and reverse index. No changes to F1.2 fact writer/triggers, RLS, public feed UX or commercial auto setting. Test one known Lidl Valencia case, mismatched range and mismatched currency. Future work: server adapter, user interface, cached lightweight object catalog, adaptive prefetch, asynchronous publication indexing with explicit states, offer-item scoping, benchmarks.
