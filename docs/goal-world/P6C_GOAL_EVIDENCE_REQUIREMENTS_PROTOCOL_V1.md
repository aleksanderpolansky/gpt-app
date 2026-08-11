# ARCTor.app — P6C Goal Evidence Requirements Protocol v1

Protocol code: `goal_evidence_requirements`
Version: `1`
Stage: P6C foundation
Source of truth: Git/code

## 1. Purpose

P6C defines what ARCTor should know before it builds a serious roadmap for a
goal.

The key object is not a questionnaire. It is an **information need**.

A professional may ask:

> "How many hours do you sit on a normal workday?"

ARCTor should represent the underlying need:

> "Typical sedentary time on workdays."

That answer may already exist in the Reality Graph, may be derivable from
observations, may be collected naturally over time, may require a direct
question, or may require professional assessment.

The system asks a question only after it has failed to obtain adequate evidence
through already allowed sources.

## 2. Why this layer exists

A goal can be accelerated or blocked by more than skill, money or physiology.

Relevant influences may include:

- physiological and medical state;
- capabilities and knowledge;
- psychological and behavioral patterns;
- stress response and recovery;
- social support and conflict;
- family/household arrangements;
- the habits of close people insofar as they affect the actor's environment;
- lifestyle and schedule;
- the actor's own habits;
- physical environment;
- workplace environment;
- social norms and expectations of the surrounding group;
- financial/material resources;
- legal or institutional conditions;
- motivation, values and non-negotiables.

These dimensions are **goal-specific influences**, not permanent global labels.

A household habit may block one goal and be irrelevant or helpful for another.

## 3. Specialist information requirement packages

A `GoalEvidenceRequirementPackage` is a versioned package describing the
information needs relevant to a class of goals from one or more professional
perspectives.

Examples of perspectives:

- dietitian;
- physician;
- physiotherapist;
- trainer;
- career adviser;
- psychologist/behavior specialist;
- business adviser;
- teacher;
- legal adviser.

ARCTor may combine several packages for a complex goal.

The package stores information needs, not personal answers.

## 4. Internet and external knowledge

Internet research is a **package-authoring / package-refresh input**, not an
uncontrolled per-user runtime authority.

Recommended flow:

1. formulate an abstract professional research question without personal data;
2. search authoritative/professional sources;
3. extract candidate information needs;
4. preserve source, publisher, version/date, jurisdiction and retrieval
   provenance;
5. validate/approve the package;
6. use the versioned package in runtime;
7. refresh it later as a new version when sources change.

A live web result must not silently become a mandatory user question.

The absence of a data item from one web source is not evidence that it is
unimportant, and the presence of a question in a blog is not enough to make it
critical.

## 5. Importance is package-specific

Requirements use:

- `critical` — a package states that a particular part of planning should not
  proceed without this information or required professional evaluation;
- `important` — materially improves the roadmap;
- `useful` — useful personalization but not a blocker;
- `optional` — optional enrichment.

These labels are not universal truths. They belong to a package version and
must retain provenance.

No percentage is automatically converted into probability of success.

## 6. Context dimensions

Every requirement declares one or more context dimensions. P6C v1 includes:

- physiological;
- medical;
- capability;
- psychological_behavioral;
- stress_recovery;
- social;
- relationship_context;
- physical_environment;
- workplace_environment;
- lifestyle;
- self_habit;
- close_person_habit;
- social_norm;
- schedule_time;
- financial;
- material_resource;
- legal_institutional;
- motivation_values;
- other.

The list is a requirement-classification vocabulary, not a Value Object
ontology.

## 7. Subject scope

Information may concern:

- the actor;
- a close person;
- the household;
- the social environment;
- the physical environment;
- an institution;
- the current goal only.

Information about close people must not be inferred through covert surveillance.
ARCTor should store only evidence legitimately available to the actor/system and
only the part relevant to the actor's goal context.

Example:

"Partner regularly orders takeaway food for the household" may be relevant to
the food environment if the user reports it or household activities legitimately
show it.

It does not authorize ARCTor to create a psychological profile of the partner.

## 8. Acquisition routes

A requirement may allow one or more evidence-acquisition routes:

- `existing_reality` — find it in the Reality Graph;
- `direct_question` — ask the user;
- `natural_observation` — wait for ordinary ARCTor activity/fact accumulation;
- `device_import` — obtain it from an explicitly allowed device/source;
- `external_document` — user-authorized document/import;
- `professional_assessment` — a qualified professional or formal assessment is
  required;
- `later_plan_observation` — proceed provisionally and measure during execution.

The same information need may support several routes.

## 9. Evidence coverage states

For a concrete goal, ARCTor compares the package against a trusted
Reality Context Snapshot and returns:

- `sufficient`;
- `partial`;
- `stale`;
- `missing`;
- `not_applicable`;
- `professional_evaluation_required`.

This is evidence coverage, not truth probability.

A stale item is not silently treated as current.

## 10. User-facing readiness report

Before roadmap construction, ARCTor should be able to say:

> We identified N relevant information needs.
>
> These are already sufficiently known.
>
> These are known only partly or are stale.
>
> These are missing.
>
> These require professional evaluation before a particular part of the plan.

Then the user may receive the applicable options:

1. `answer_now` — answer only missing questions now;
2. `observe_then_refresh` — allow naturally accumulating evidence and revisit
   the same goal later;
3. `proceed_provisionally` — create a preliminary plan and revise it when new
   evidence arrives;
4. `professional_assessment` — obtain required professional assessment for the
   affected part.

The system must not pretend all four options are always available.

## 11. Blockers and accelerators

P6C distinguishes **information requirements** from **influence assessments**.

A requirement may ask for "household food routine". Only after evidence exists
may a goal-specific analysis conclude that the observed routine is:

- `potential_accelerator`;
- `potential_blocker`;
- `mixed`;
- `context_only`;
- `unknown`.

No global statement such as "family is a blocker" should be stored from this.

Every material influence assessment should retain evidence references and the
goal/world context in which it was made.

## 12. Example: body-weight change

For a body-weight goal, a professionally authored package may eventually need
information about sleep, stress/recovery, sedentary time, activity, relevant
health context, medications, eating pattern, previous attempts, schedule,
resources, household food environment, habits of close people that materially
shape the household environment, and social norms around food/activity.

P6C v1 does **not** declare that exact list medically complete.

The production list must come from versioned authoritative sources and the
appropriate specialist perspectives.

The architectural rule is already fixed: find answers in existing reality
first; ask only for material gaps.

## 13. Example: environment can dominate the goal

A person may have strong motivation and adequate physiological capacity but
live in an environment where:

- work routinely ends after midnight;
- all close social meetings revolve around alcohol/food;
- a partner strongly resists schedule changes;
- the household has no practical way to cook;
- the workplace provides constant high-calorie food and no movement breaks.

Those are not "weak willpower".

They are observable contextual conditions that can change the feasibility,
friction and design of the roadmap.

The same logic applies to professions, education, sport, business, family goals
and other Goal Worlds.

## 14. Safety and non-goals

P6C v1 does not:

- diagnose medical or psychological conditions;
- define a production medical questionnaire;
- make live web search a hidden runtime requirement;
- create Value Objects;
- create Goal Worlds;
- persist personal answers;
- assign universal fit/success scores;
- infer private facts about close people without evidence;
- turn contextual observations into permanent personality labels.

P6C only establishes the deterministic contract for professional information
needs, evidence coverage and acquisition options.
