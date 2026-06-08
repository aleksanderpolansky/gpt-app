"use client";

import { useCallback, useEffect, useState } from "react";

import type { SemanticCloudPublicApiResponse } from "../../types/semantic-cloud";

import { SemanticCloudWordCloud } from "./semantic-cloud-word-cloud";

export type SemanticCloudPanelProps = {
  readonly open: boolean;
  readonly onClose: () => void;
};

const publicSemanticCloudEndpoint = "/api/semantic-cloud/public";

function getDiagnosticsLabel(data: SemanticCloudPublicApiResponse | null) {
  if (!data) {
    return "not loaded";
  }

  return data.diagnostics.sourceStatus;
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Semantic cloud could not be loaded.";
}

function formatSafetyFlag(value: boolean | undefined) {
  return value === true ? "yes" : "no";
}

export function SemanticCloudPanel({ open, onClose }: SemanticCloudPanelProps) {
  const [data, setData] = useState<SemanticCloudPublicApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [safeError, setSafeError] = useState<string | null>(null);

  const loadCloud = useCallback(async () => {
    setIsLoading(true);
    setSafeError(null);

    try {
      const response = await fetch(publicSemanticCloudEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const payload = (await response.json()) as SemanticCloudPublicApiResponse;

      if (!response.ok || payload.ok === false) {
        const message =
          payload.ok === false
            ? payload.error.message
            : "Semantic cloud route returned an unsafe response.";

        throw new Error(message);
      }

      setData(payload);
    } catch (error) {
      setSafeError(getSafeErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadCloud();
  }, [loadCloud, open]);

  if (!open) {
    return null;
  }

  const sourceStatus = getDiagnosticsLabel(data);
  const items = data?.items ?? [];
  const diagnostics = data?.diagnostics;
  const emptyReason = diagnostics?.emptyReason;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="semantic-cloud-panel-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 py-6 backdrop-blur-sm"
    >
      <div className="max-h-[calc(100vh-48px)] w-full max-w-5xl overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3b6ef8]">
              Public Semantic Cloud
            </p>
            <h2
              id="semantic-cloud-panel-title"
              className="mt-1 text-lg font-bold text-[#1a1d2e]"
            >
              Облако публичных категорий
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#7c8099]">
              Read-only public-safe projection over shared semantic graph. Bigger
              word means more public objects.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close semantic cloud panel"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white text-lg font-semibold text-[#7c8099] shadow-sm hover:bg-[#f0f2f7]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(100vh-170px)] overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[rgba(59,110,248,0.18)] bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#3b6ef8]">
              status: {sourceStatus}
            </span>
            <span className="rounded-full border border-black/10 bg-[#f0f2f7] px-3 py-1 text-xs font-semibold text-[#7c8099]">
              words: {items.length}
            </span>
            <span className="rounded-full border border-black/10 bg-[#f0f2f7] px-3 py-1 text-xs font-semibold text-[#7c8099]">
              GET-only
            </span>
            <span className="rounded-full border border-black/10 bg-[#f0f2f7] px-3 py-1 text-xs font-semibold text-[#7c8099]">
              no hidden writes
            </span>
          </div>

          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-[rgba(124,128,153,0.35)] bg-[#f0f2f7] p-6 text-sm font-semibold text-[#7c8099]">
              Loading public semantic cloud...
            </div>
          ) : safeError ? (
            <div className="rounded-3xl border border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)] p-5">
              <p className="text-sm font-semibold text-[#b91c1c]">
                Semantic cloud is temporarily unavailable
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7c8099]">
                {safeError}
              </p>
              <button
                type="button"
                onClick={() => void loadCloud()}
                className="mt-4 inline-flex h-9 items-center rounded-xl border border-[rgba(239,68,68,0.18)] bg-white px-3 text-xs font-semibold text-[#b91c1c] shadow-sm hover:bg-white/80"
              >
                Retry GET
              </button>
            </div>
          ) : (
            <SemanticCloudWordCloud items={items} />
          )}

          {emptyReason ? (
            <p className="mt-4 rounded-2xl bg-[#f0f2f7] px-4 py-3 text-xs leading-5 text-[#7c8099]">
              Empty reason: {emptyReason}
            </p>
          ) : null}

          {diagnostics ? (
            <div className="mt-4 grid gap-2 text-xs text-[#7c8099] sm:grid-cols-2 lg:grid-cols-5">
              <span>
                excludedPrivateLinks:{" "}
                {formatSafetyFlag(diagnostics.excludedPrivateLinks)}
              </span>
              <span>
                excludedRawCandidates:{" "}
                {formatSafetyFlag(diagnostics.excludedRawCandidates)}
              </span>
              <span>
                excludedPreviewCandidates:{" "}
                {formatSafetyFlag(diagnostics.excludedPreviewCandidates)}
              </span>
              <span>
                excludedUnresolvedCandidates:{" "}
                {formatSafetyFlag(diagnostics.excludedUnresolvedCandidates)}
              </span>
              <span>
                excludedValueObjectTitlesAsLabelsInV0:{" "}
                {formatSafetyFlag(
                  diagnostics.excludedValueObjectTitlesAsLabelsInV0
                )}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
