# ARCTor.app — Personal Suitability Analysis Contract v1

Contract code: `personal_suitability_analysis`
Version: `1`
Stage: architectural consumer contract
Source of truth: Git/code

## 1. Purpose

The same Reality Graph and Reality Context Snapshot can support future
personalized recommendations beyond explicit goals.

Examples include:

- professional orientation and occupations;
- education/learning paths;
- sports and physical activities;
- hobbies and recurring activities;
- work environments and collaboration formats;
- relationship/communication practices;
- candidate life projects or opportunities.

This is a consumer of the Reality Graph, not a new personal-profile database.

## 2. Core principle

ARCTor should compare a person's **observed current reality and trajectory**
against the requirements/opportunities of a candidate option.

It should not reduce a person to a questionnaire score or static psychological
type.

The analysis is not limited to skill/capability. It also asks whether the
**life pattern required by the option is sustainable for this particular
person**.

## 3. Candidate model

A candidate occupation, sport, activity or other option should be described by
a versioned requirement/opportunity profile:

- relevant capabilities and skills;
- physical/health requirements;
- time/resource requirements;
- environmental/context conditions;
- lifestyle demands;
- psychological/behavioral demands where they can be stated responsibly;
- constraints/contraindications when legitimately known;
- learning/adaptation requirements;
- external evidence/source references.

Examples of lifestyle/behavioral demands include travel frequency, hotel stays,
irregular sleep, public evaluation, social intensity, conflict exposure,
uncertainty, autonomy, repetitive routine, sensory load and recovery demands.

External catalogs may provide candidate definitions, but they do not become the
ARCTor ontology automatically.

## 4. Person-side evidence

Suitability analysis may use multiple evidence classes, kept separate:

- demonstrated capabilities;
- observed behavioral patterns;
- repeated situational reactions;
- self-reported preferences/desires;
- current health/physical state;
- resources and constraints;
- family/social context;
- trajectory and adaptation history;
- unknowns.

A self-report such as "I want applause" is not automatically stronger evidence
than repeatedly observed difficulty with a touring lifestyle, and vice versa.
The analysis must show both when they conflict.

## 5. Tension analysis

ARCTor should explicitly identify internal tensions rather than averaging them
away.

Example:

A person wants to become a rock star and enjoys applause, but repeated evidence
shows strong preference for home routine, poor recovery after travel, and high
distress from hotel living.

The result should not be "unsuitable for music".

It should say, for example:

- public performance appears motivating;
- touring lifestyle may be a strong friction factor;
- a local performance model, studio work, residency-based work or shorter tours
  may fit better;
- the uncertain parts should be tested by small reversible experiments.

This makes the system useful for realistic life design instead of only matching
job titles.

## 6. Comparison output

The analysis should expose separately:

- strong evidence of compatibility;
- possible compatibility;
- current gaps;
- lifestyle/behavioral friction factors;
- constraints/conflicts;
- unknowns that prevent a reliable comparison;
- adaptable requirements;
- proposed low-cost experiments/tests;
- evidence and source references.

It must not collapse all of this into one opaque "fit score".

A numeric score may exist only if its formula, weights, evidence and calibration
are explicit and versioned.

## 7. Proposal-only rule

Suitability analysis is proposal-only. It proposes options and trade-offs. It
does not silently:

- choose a profession for the user;
- prescribe a sport;
- judge a relationship partner/person as objectively suitable;
- diagnose a personality or mental disorder;
- mutate the canonical Reality Graph;
- create a Goal World without user confirmation.

## 8. Dynamic rather than static suitability

Suitability can change because the person changes.

A profession that is poorly matched today may become suitable after language,
education, health, coping or environmental changes. A sport may become
unsuitable after an injury and suitable again after rehabilitation.

The system therefore compares **time-indexed state and observed trajectory**
with a candidate profile, not an immutable personality label.

## 9. Observed behavior over questionnaire labels

Questionnaires may be supplementary, but ARCTor should prefer longitudinal
evidence from real behavior when available:

- what activities the person repeatedly starts or avoids;
- persistence and recovery after difficulty;
- reaction to social/public exposure;
- response to travel, schedule disruption and uncertainty;
- task switching and procrastination patterns;
- actual collaboration/conflict behavior;
- sustainable versus unsustainable workload;
- what environments repeatedly improve or degrade functioning.

No single observation is enough to define a stable psychological property.

## 10. Personalization example

Two people say:
"I want to start a business in Germany."

Person A:
- German C1;
- German-speaking network;
- low available capital.

Person B:
- little German;
- enough capital to buy an existing company;
- access to professional legal/management support.

The same goal can yield very different bottlenecks, recommendations and Goal
World structures. ARCTor should explain those differences through the evidence
in each Reality Context Snapshot.

## 11. Future external knowledge packages

Candidate profiles can later be populated from versioned external packages, for
example occupational/skill catalogs, sports/health guidance, education
frameworks or legal/business information.

Every package must retain source, jurisdiction/date/version and retrieval
provenance. Retrieved knowledge supports analysis but does not override the
approved ARCTor protocols.

## 12. Relationship recommendations

For relationship-related analysis, ARCTor should recommend communication
practices, environments, boundaries or experiments based on observed evidence.

It should not claim that sparse behavioral data proves a person's character,
diagnosis or compatibility with another person.

## 13. Acceptance boundary

This contract only establishes the reusable architecture. A later runtime must
define:

- candidate registry/package format;
- comparison methodology;
- evidence thresholds;
- user-facing explanation;
- controlled feedback loop from outcomes.
