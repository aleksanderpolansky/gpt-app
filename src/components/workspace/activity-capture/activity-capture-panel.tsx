"use client";

import { useMemo, useState } from "react";

import { ActivityAccessibilityNotes } from "./activity-accessibility-notes";
import { ActivityCaptureEmptyState } from "./activity-empty-state";
import { ActivityInput } from "./activity-input";
import { ActivityPreviewActionRow } from "./activity-preview-action-row";
import { ActivityQuickExamplePrompts } from "./activity-quick-example-prompts";
import { ActivityValidationMessages } from "./activity-validation-messages";
import { activityCaptureExamplePrompts } from "./activity-capture-fixtures";
import { mapLocalCategoryCandidates, mapUnknownTermCandidates } from "./activity-category-mapper";
import { parseLocalActivity } from "./activity-local-parser";
import { mapPrivacyHints } from "./activity-privacy-hint-mapper";
import { LocalCategoryPreviewPanel } from "./local-category-preview-panel";
import { LocalParsingExplanationPanel } from "./local-parsing-explanation-panel";
import { PrivacyHintsPanel } from "./privacy-hints-panel";
import { SubmittedActivityPanel } from "./submitted-activity-panel";
import { ValueObjectCandidatePanel } from "./value-object-candidate-panel";
import type { LocalParserResult } from "./activity-capture-types";
import { mapValueObjectCandidates } from "./activity-value-object-mapper";
import { ActivityReviewCard, ActivityReviewEmptyState, ActivityReviewFixturePreviewSwitch, defaultActivityReviewFixture, normalizeLocalParserResultToReviewPackage } from "../activity-review";

export const ACTIVITY_REVIEW_CONNECTED_TO_ACTIVITY_CAPTURE =
  "ACTIVITY_REVIEW_CONNECTED_TO_ACTIVITY_CAPTURE" as const;

export const ACTIVITY_REVIEW_FIXTURE_PREVIEW_SWITCH_CONNECTED =
  "ACTIVITY_REVIEW_FIXTURE_PREVIEW_SWITCH_CONNECTED" as const;


export const ACTIVITY_CAPTURE_PANEL_CREATED =
  "ACTIVITY_CAPTURE_PANEL_CREATED" as const;

export const ACTIVITY_LOCAL_SUBMIT_CREATED =
  "ACTIVITY_LOCAL_SUBMIT_CREATED" as const;

const shellStatusItems = [
  "Local preview only",
  "Draft activity, not saved",
  "Candidate categories, not truth",
  "Candidate Value Objects, not created",
  "Privacy hints, not decisions",
];

const inputRegionId = "activity-capture-input-region";
const previewRegionId = "activity-capture-preview-region";
const safetyRegionId = "activity-capture-safety-boundary";

function createLocalPreview(rawText: string): LocalParserResult {
  const baseResult = parseLocalActivity(rawText);
  const categoryCandidates = mapLocalCategoryCandidates(baseResult.draft.rawText);
  const valueObjectCandidates = mapValueObjectCandidates(
    baseResult.draft.rawText,
    categoryCandidates,
  );
  const privacyHints = mapPrivacyHints(
    baseResult.draft.rawText,
    categoryCandidates,
    valueObjectCandidates,
  );
  const unknownTermCandidates = mapUnknownTermCandidates(baseResult.draft.rawText);

  return {
    ...baseResult,
    draft: {
      ...baseResult.draft,
      status: "preview",
    },
    categoryCandidates,
    valueObjectCandidates,
    privacyHints,
    unknownTermCandidates,
    explanation: [
      ...baseResult.explanation,
      "Local submit handler ÑÐ¾Ð±Ñ€Ð°Ð» preview Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð² React state.",
      "Category candidates, Value Object candidates Ð¸ privacy hints Ð½Ðµ ÑÐ²Ð»ÑÑŽÑ‚ÑÑ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½Ð½Ñ‹Ð¼Ð¸ Ñ„Ð°ÐºÑ‚Ð°Ð¼Ð¸.",
    ],
  };
}

interface ActivityReviewPreviewSlotProps {
  parserResult: LocalParserResult | null;
}

function ActivityReviewPreviewSlot({
  parserResult,
}: ActivityReviewPreviewSlotProps) {
  const [showFixtureReview, setShowFixtureReview] = useState<boolean>(true);

  return (
    <div
      className="space-y-4 lg:col-span-2"
      data-ui5-review-connection="activity-review-card"
      data-ui5-visible-review-slot="activity-review-preview-slot"
    >
      <ActivityReviewFixturePreviewSwitch
        isEnabled={showFixtureReview}
        onToggle={() =>
          setShowFixtureReview((currentValue: boolean) => !currentValue)
        }
        fixtureLabel={defaultActivityReviewFixture.normalizedActivity.title}
      />

      {parserResult !== null ? (
        <ActivityReviewCard
          reviewPackage={normalizeLocalParserResultToReviewPackage(parserResult)}
          title="Ð¯ Ð¿Ð¾Ð½ÑÐ» ÑÑ‚Ð¾ Ñ‚Ð°Ðº"
          description="Ð­Ñ‚Ð¾ local-only review package: candidate, not truth. ÐšÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐ° Ð½Ð¸Ñ‡ÐµÐ³Ð¾ Ð½Ðµ ÑÐ¾Ñ…Ñ€Ð°Ð½ÑÐµÑ‚, Ð½Ðµ ÑÐ¾Ð·Ð´Ð°Ñ‘Ñ‚ Activity Event Ð¸ Ð½Ðµ Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÐµÑ‚ DB write."
        />
      ) : showFixtureReview ? (
        <ActivityReviewCard
          reviewPackage={defaultActivityReviewFixture}
          title="Fixture preview: Ð¯ Ð¿Ð¾Ð½ÑÐ» ÑÑ‚Ð¾ Ñ‚Ð°Ðº"
          description="Ð­Ñ‚Ð¾ Ð´ÐµÐ¼Ð¾Ð½ÑÑ‚Ñ€Ð°Ñ†Ð¸Ð¾Ð½Ð½Ñ‹Ð¹ local-only fixture package. ÐžÐ½ Ð½ÑƒÐ¶ÐµÐ½ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð´Ð»Ñ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸ UI Ð¸ Ð½Ðµ ÑÐ¾Ð·Ð´Ð°Ñ‘Ñ‚ Activity Event, Value Objects Ð¸Ð»Ð¸ DB write."
        />
      ) : (
        <ActivityReviewEmptyState />
      )}
    </div>
  );
}

function ActivityReviewForcedVisibleSlot() {
  return (
    <section
      className="space-y-4 rounded-3xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950"
      data-ui5-review-connection="activity-review-card"
      data-ui5-visible-review-slot="activity-review-preview-slot"
      aria-label="Visible UI-5 Activity Review preview slot"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-200">
            UI-5 Activity Review
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">
            Review card will appear here
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            Visible manual-QA slot: local-only candidate package. No hidden writes.
            No Activity Event. No Value Objects creation. No DB write.
          </p>
        </div>

        <span className="inline-flex shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-slate-950 dark:text-emerald-200">
          UI5 visible
        </span>
      </div>

      <ActivityReviewFixturePreviewSwitch
        isEnabled={true}
        onToggle={() => undefined}
        fixtureLabel={defaultActivityReviewFixture.normalizedActivity.title}
      />

      <ActivityReviewCard
        reviewPackage={defaultActivityReviewFixture}
        title="Fixture preview: Ð¯ Ð¿Ð¾Ð½ÑÐ» ÑÑ‚Ð¾ Ñ‚Ð°Ðº"
        description="Ð­Ñ‚Ð¾ Ð´ÐµÐ¼Ð¾Ð½ÑÑ‚Ñ€Ð°Ñ†Ð¸Ð¾Ð½Ð½Ñ‹Ð¹ local-only fixture package. ÐžÐ½ Ð½ÑƒÐ¶ÐµÐ½ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð´Ð»Ñ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸ UI Ð¸ Ð½Ðµ ÑÐ¾Ð·Ð´Ð°Ñ‘Ñ‚ Activity Event, Value Objects Ð¸Ð»Ð¸ DB write."
      />

      <ActivityReviewEmptyState
        title="Review card will appear here"
        description="Ð­Ñ‚Ð¾Ñ‚ fallback Ð¾ÑÑ‚Ð°Ñ‘Ñ‚ÑÑ Ð²Ð¸Ð´Ð¸Ð¼Ñ‹Ð¼ Ð¼Ð°Ñ€ÐºÐµÑ€Ð¾Ð¼ UI-5.33 visual QA: local-only, No hidden writes, no Activity Event, no DB write."
      />
    </section>
  );
}

function ActivityCapturePanelShellStatus() {
  return (
    <div
      aria-label="Activity Capture local MVP boundaries"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        UI-4 local MVP
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {shellStatusItems.map((item) => (
          <span
            key={item}
            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function LocalSubmitPreviewSummary({
  parserResult,
  onExampleClick,
}: {
  parserResult: LocalParserResult | null;
  onExampleClick: (rawText: string) => void;
}) {
  if (!parserResult) {
    return (
      <ActivityCaptureEmptyState
        examples={activityCaptureExamplePrompts}
        onExampleClick={onExampleClick}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">

      <SubmittedActivityPanel
        draft={parserResult.draft}
        normalizedTitle={parserResult.normalizedTitle}
      />

      <LocalCategoryPreviewPanel
        categoryCandidates={parserResult.categoryCandidates}
        unknownTermCandidates={parserResult.unknownTermCandidates}
      />

      <ValueObjectCandidatePanel
        valueObjectCandidates={parserResult.valueObjectCandidates}
      />

      <PrivacyHintsPanel privacyHints={parserResult.privacyHints} />

      <LocalParsingExplanationPanel parserResult={parserResult} />

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Local preview counters
            </p>

            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Candidate summary
            </h3>
          </div>

          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
            {parserResult.draft.status}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Categories
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {parserResult.categoryCandidates.length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Value Objects
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {parserResult.valueObjectCandidates.length}
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Privacy hints
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {parserResult.privacyHints.length}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-indigo-700">
          UI-4 preview completed locally. Accessibility labels are now attached
          to the main section, input region, preview region and safety boundary.
        </p>
      </div>
    </div>
  );
}

function ActivityCapturePanelInner() {
  const [inputValue, setInputValue] = useState("");
  const [parserResult, setParserResult] = useState<LocalParserResult | null>(null);
const trimmedInputValue = inputValue.trim();

  const localPreviewStatus = useMemo(() => {
    if (!parserResult) {
      return "Empty state Â· waiting for activity";
    }

    return `Preview ready Â· ${parserResult.categoryCandidates.length} categories Â· ${parserResult.valueObjectCandidates.length} Value Objects`;
  }, [parserResult]);

  function handlePreviewClick() {
    if (trimmedInputValue.length < 3) {
      return;
    }

    setParserResult(createLocalPreview(trimmedInputValue));
  }

  function handleClearPreview() {
    setParserResult(null);
  }

  function handleClearClick() {
    setInputValue("");
    setParserResult(null);
  }

  function handleExampleClick(rawText: string) {
    setInputValue(rawText);
    setParserResult(null);
  }

  return (
    <section
      aria-labelledby="activity-capture-title"
      aria-describedby="activity-capture-description activity-capture-a11y-summary"
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Activity Capture
          </p>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2
                id="activity-capture-title"
                className="text-xl font-semibold tracking-tight text-slate-950"
              >
                Ð—Ð°Ð¿Ð¸ÑÑŒ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸
              </h2>

              <p
                id="activity-capture-description"
                className="mt-2 max-w-2xl text-sm leading-6 text-slate-600"
              >
                ÐŸÐ¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ñ‚ÐµÐ»ÑŒ Ð²Ð²Ð¾Ð´Ð¸Ñ‚ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚ÑŒ, Ð° UI Ð¿Ð¾ÐºÐ°Ð·Ñ‹Ð²Ð°ÐµÑ‚ Ð»Ð¾ÐºÐ°Ð»ÑŒÐ½Ñ‹Ð¹ draft
                preview, ÐºÐ°Ñ‚ÐµÐ³Ð¾Ñ€Ð¸Ð¸-ÐºÐ°Ð½Ð´Ð¸Ð´Ð°Ñ‚Ñ‹, Value Object candidates, privacy
                hints Ð¸ Ð¾Ð±ÑŠÑÑÐ½ÐµÐ½Ð¸Ðµ Ð±ÐµÐ· ÑÐ¾Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸Ñ Ð´Ð°Ð½Ð½Ñ‹Ñ….
              </p>
            </div>

            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Local state only
            </span>
          </div>
        </div>

        <ActivityCapturePanelShellStatus />

        <ActivityAccessibilityNotes
          inputRegionId={inputRegionId}
          previewRegionId={previewRegionId}
          safetyRegionId={safetyRegionId}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div
            id={inputRegionId}
            aria-label="Activity Capture input, validation and local controls"
            className="flex flex-col gap-4"
          >
            <ActivityInput
              value={inputValue}
              onValueChange={setInputValue}
              onPreviewClick={handlePreviewClick}
              onClearClick={handleClearClick}
              onExampleClick={handleExampleClick}
            />

            <ActivityValidationMessages
              inputValue={inputValue}
              hasPreview={Boolean(parserResult)}
              categoryCount={parserResult?.categoryCandidates.length ?? 0}
              valueObjectCount={parserResult?.valueObjectCandidates.length ?? 0}
              privacyHintCount={parserResult?.privacyHints.length ?? 0}
            />

            <ActivityPreviewActionRow
              hasPreview={Boolean(parserResult)}
              draftLength={trimmedInputValue.length}
              categoryCount={parserResult?.categoryCandidates.length ?? 0}
              valueObjectCount={parserResult?.valueObjectCandidates.length ?? 0}
              privacyHintCount={parserResult?.privacyHints.length ?? 0}
              onClearPreview={handleClearPreview}
              onResetAll={handleClearClick}
            />

            <div
              id={previewRegionId}
              aria-label="Activity Capture local preview region"
              aria-live="polite"
            >
              <LocalSubmitPreviewSummary
                parserResult={parserResult}
                onExampleClick={handleExampleClick}
              />
            </div>
          </div>

          <ActivityQuickExamplePrompts
            examples={activityCaptureExamplePrompts}
            onExampleClick={handleExampleClick}
          />
        </div>

        <div
          id={safetyRegionId}
          aria-label="Activity Capture safety boundary"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Ð’Ð°Ð¶Ð½Ð¾Ðµ Ð¾Ð³Ñ€Ð°Ð½Ð¸Ñ‡ÐµÐ½Ð¸Ðµ UI-4
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Ð­Ñ‚Ð¾Ñ‚ Ð±Ð»Ð¾Ðº Ð¿Ð¾ÐºÐ°Ð·Ñ‹Ð²Ð°ÐµÑ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ð»Ð¾ÐºÐ°Ð»ÑŒÐ½Ñ‹Ð¹ draft Ð¸ candidates. ÐžÐ½ Ð½Ðµ
                ÑÐ¾Ð·Ð´Ð°Ñ‘Ñ‚ Activity Event, Ð½Ðµ ÑÐ¾Ð·Ð´Ð°Ñ‘Ñ‚ Value Object Ð¸ Ð½Ðµ Ð¿Ñ€Ð¸Ð½Ð¸Ð¼Ð°ÐµÑ‚
                privacy decisions.
              </p>
            </div>

            <span
              role="status"
              aria-label="Activity Capture local preview status"
              className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800"
            >
              {localPreviewStatus}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}








export function ActivityCapturePanel() {
  return (
    <>
      <div data-ui5-visible-review-slot-mounted="activity-review-preview-slot">
        <ActivityReviewForcedVisibleSlot />
      </div>

      <ActivityCapturePanelInner />
    </>
  );
}
export const ACTIVITY_REVIEW_PREVIEW_SLOT_COMPONENT =
  ActivityReviewPreviewSlot;
