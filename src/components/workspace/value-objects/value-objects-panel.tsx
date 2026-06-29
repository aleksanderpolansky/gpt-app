"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SELECTED_VALUE_OBJECT_ID,
  VALUE_OBJECT_DOMAIN_GROUPS,
  VALUE_OBJECT_FIXTURES,
} from "./value-object-fixtures";
import type {
  ValueObjectDomain,
  ValueObjectFilterState,
  ValueObjectUiNode,
} from "./value-object-types";
import {
  createValueObjectNormalizedModel,
  filterValueObjects,
  getValueObjectChildren,
  getValueObjectRelatedObjects,
  resolveSelectedValueObject,
} from "./value-object-normalizer";
import { ValueObjectCloud } from "./value-object-cloud";
import { ValueObjectDetailPanel } from "./value-object-detail-panel";
import { ValueObjectDomainFilter } from "./value-object-domain-filter";
import { ValueObjectList } from "./value-object-list";
import { ValueObjectSummaryStrip } from "./value-object-summary-strip";
import { ValueObjectTree } from "./value-object-tree";
import {
  ValueObjectViewSwitcher,
  type ValueObjectViewMode,
} from "./value-object-view-switcher";
import {
  getLocaleSearchParam,
  getValueObjectsMessage,
  type LocaleCode,
  type ValueObjectsMessageKey,
} from "@/i18n";

const DEFAULT_FILTER_STATE: ValueObjectFilterState = {
  searchQuery: "",
  selectedDomains: [],
  selectedPrivacyLevels: [],
  selectedStatuses: [],
  showOnlyNeedsReview: false,
};

const PANEL_CLASSES =
  "min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8";

const SHELL_CLASSES = "mx-auto flex max-w-7xl flex-col gap-5";

const HERO_CLASSES =
  "rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur";

const HERO_LABEL_CLASSES =
  "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500";

const HERO_TITLE_CLASSES =
  "text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl";

const HERO_TEXT_CLASSES = "max-w-3xl text-sm leading-6 text-slate-600";

const SEARCH_INPUT_CLASSES =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100";

const SEARCH_CARD_CLASSES =
  "rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur";

const SEARCH_LABEL_CLASSES =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

const READ_ONLY_NOTICE_CLASSES =
  "rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900";

const MAIN_GRID_CLASSES = "grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]";

const VIEW_AREA_CLASSES = "flex min-w-0 flex-col gap-5";

const DETAIL_AREA_CLASSES = "min-w-0 xl:sticky xl:top-6 xl:self-start";

const getSelectedObjectId = (
  selectedObject: ValueObjectUiNode | undefined,
): string | undefined => selectedObject?.id;


function useInterfaceLocale(): LocaleCode {
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    function readLocaleFromUrl() {
      if (typeof window === "undefined") {
        return;
      }

      setLocale(getLocaleSearchParam(new URLSearchParams(window.location.search)));
    }

    readLocaleFromUrl();
    window.addEventListener("popstate", readLocaleFromUrl);

    return () => {
      window.removeEventListener("popstate", readLocaleFromUrl);
    };
  }, []);

  return locale;
}

export function ValueObjectsPanel() {
  const locale = useInterfaceLocale();
  const t = useMemo(
    () => (key: ValueObjectsMessageKey) => getValueObjectsMessage(key, locale),
    [locale],
  );

  const [filterState, setFilterState] =
    useState<ValueObjectFilterState>(DEFAULT_FILTER_STATE);
  const [activeView, setActiveView] = useState<ValueObjectViewMode>("list");
  const [selectedObjectId, setSelectedObjectId] = useState(
    DEFAULT_SELECTED_VALUE_OBJECT_ID,
  );

  const normalizedModel = useMemo(
    () =>
      createValueObjectNormalizedModel(
        VALUE_OBJECT_FIXTURES,
        VALUE_OBJECT_DOMAIN_GROUPS,
      ),
    [],
  );

  const filteredValueObjects = useMemo(
    () => filterValueObjects(normalizedModel.objects, filterState),
    [filterState, normalizedModel.objects],
  );

  const selectedValueObject = useMemo(
    () =>
      resolveSelectedValueObject(filteredValueObjects, selectedObjectId) ??
      resolveSelectedValueObject(
        normalizedModel.objects,
        DEFAULT_SELECTED_VALUE_OBJECT_ID,
      ),
    [filteredValueObjects, normalizedModel.objects, selectedObjectId],
  );

  const selectedPanelObjectId = getSelectedObjectId(selectedValueObject);

  const childObjects = useMemo(
    () =>
      selectedValueObject
        ? getValueObjectChildren(normalizedModel.objects, selectedValueObject.id)
        : [],
    [normalizedModel.objects, selectedValueObject],
  );

  const relatedObjects = useMemo(
    () =>
      selectedValueObject
        ? getValueObjectRelatedObjects(normalizedModel.objects, selectedValueObject)
        : [],
    [normalizedModel.objects, selectedValueObject],
  );

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilterState((currentState) => ({
      ...currentState,
      searchQuery: event.target.value,
    }));
  };

  const handleDomainToggle = (domain: ValueObjectDomain) => {
    setFilterState((currentState) => {
      const isSelected = currentState.selectedDomains.includes(domain);

      return {
        ...currentState,
        selectedDomains: isSelected
          ? currentState.selectedDomains.filter(
              (selectedDomain) => selectedDomain !== domain,
            )
          : [...currentState.selectedDomains, domain],
      };
    });
  };

  const handleReviewToggle = () => {
    setFilterState((currentState) => ({
      ...currentState,
      showOnlyNeedsReview: !currentState.showOnlyNeedsReview,
    }));
  };

  const handleResetFilters = () => {
    setFilterState(DEFAULT_FILTER_STATE);
    setSelectedObjectId(DEFAULT_SELECTED_VALUE_OBJECT_ID);
  };

  const handleViewChange = (viewMode: ValueObjectViewMode) => {
    setActiveView(viewMode);
  };

  const renderActiveView = () => {
    if (activeView === "tree") {
      return (
        <ValueObjectTree
          valueObjects={filteredValueObjects}
          domainGroups={normalizedModel.domainGroups}
          selectedObjectId={selectedPanelObjectId}
        />
      );
    }

    if (activeView === "cloud") {
      return (
        <ValueObjectCloud
          valueObjects={filteredValueObjects}
          domainGroups={normalizedModel.domainGroups}
          selectedObjectId={selectedPanelObjectId}
        />
      );
    }

    return (
      <ValueObjectList
        valueObjects={filteredValueObjects}
        domainGroups={normalizedModel.domainGroups}
        selectedObjectId={selectedPanelObjectId}
      />
    );
  };

  return (
    <main className={PANEL_CLASSES}>
      <div className={SHELL_CLASSES}>
        <section className={HERO_CLASSES} aria-label={t("valueObjects.panel.title")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className={HERO_LABEL_CLASSES}>{t("valueObjects.panel.eyebrow")}</p>
              <h1 className={HERO_TITLE_CLASSES}>{t("valueObjects.panel.title")}</h1>
              <p className={HERO_TEXT_CLASSES}>
                {t("valueObjects.panel.description")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                {t("valueObjects.panel.currentView")}
              </p>
              <p className="text-lg font-semibold capitalize text-slate-950">
                {activeView}
              </p>
            </div>
          </div>
        </section>

        <ValueObjectSummaryStrip summary={normalizedModel.summary} />

        <section className={SEARCH_CARD_CLASSES} aria-label={t("valueObjects.panel.searchLabel")}>
          <label className={SEARCH_LABEL_CLASSES} htmlFor="value-object-search">
            {t("valueObjects.panel.searchLabel")}
          </label>
          <input
            id="value-object-search"
            className={SEARCH_INPUT_CLASSES}
            type="search"
            value={filterState.searchQuery}
            onChange={handleSearchChange}
            placeholder={t("valueObjects.panel.searchPlaceholder")}
          />
        </section>

        <ValueObjectDomainFilter
          domainGroups={normalizedModel.domainGroups}
          filterState={filterState}
          totalCount={normalizedModel.objects.length}
          visibleCount={filteredValueObjects.length}
          onDomainToggle={handleDomainToggle}
          onReviewToggle={handleReviewToggle}
          onResetFilters={handleResetFilters}
        />

        <ValueObjectViewSwitcher
          activeView={activeView}
          visibleCount={filteredValueObjects.length}
          totalCount={normalizedModel.objects.length}
          onViewChange={handleViewChange}
        />

        <div className={READ_ONLY_NOTICE_CLASSES}>
          {t("valueObjects.panel.readOnlyNotice")}
        </div>

        <div className={MAIN_GRID_CLASSES}>
          <div className={VIEW_AREA_CLASSES}>{renderActiveView()}</div>

          <div className={DETAIL_AREA_CLASSES}>
            <ValueObjectDetailPanel
              valueObject={selectedValueObject}
              domainGroups={normalizedModel.domainGroups}
              childObjects={childObjects}
              relatedObjects={relatedObjects}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
