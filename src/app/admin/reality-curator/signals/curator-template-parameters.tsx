"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LocaleCode } from "@/i18n";

import { CuratorObjectBootstrap } from "./curator-object-bootstrap";
import { CuratorSystemTemplateMaterialization } from "./curator-system-template-materialization";

type ParameterItem = {
  id: string;
  parameterCode: string;
  title: string;
  description: string | null;
  dimensionCode: string;
  valueTypeCode: string;
  canonicalUnitCode: string;
  canonicalUnitLabel: string;
  aggregationMethodCode: string;
  defaultWindowCode: string;
  status: string;
};

type SelectedParameterItem = ParameterItem & {
  selectionSource: string;
  selectedAt: string;
  mappingCompleted: boolean;
  mappingResult: string | null;
  mappingSummaryRu: string | null;
  mappingSummaryEn: string | null;
  mappingCount: number;
  mappingIteration: number;
  mappings: Array<{
    valueObjectId: string;
    title: string | null;
    summaryRu: string | null;
    summaryEn: string | null;
    source: "existing" | "created";
  }>;
};

type ParameterState = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  confirmed?: boolean;
  confirmationComment?: string | null;
  selected?: SelectedParameterItem[];
  available?: ParameterItem[];
};

type CreatedParameterResponse = {
  ok?: boolean;
  error?: string;
  errorCode?: string;
  definition?: ParameterItem;
};

type Props = {
  signalId: string;
  locale: LocaleCode;
  onChanged: () => void;
};

type AddMode = "existing" | "new";

type Copy = {
  title: string;
  hint: string;
  rule: string;
  selectedTitle: string;
  noneSelected: string;
  addAdditional: string;
  chooseExisting: string;
  createNew: string;
  searchPlaceholder: string;
  noAvailable: string;
  addParameter: string;
  selectedBadge: string;
  mappingReady: string;
  mappingPending: string;
  confirmTitle: string;
  confirmHint: string;
  confirmComment: string;
  confirmCommentHint: string;
  confirmButton: string;
  confirmed: string;
  confirmedHint: string;
  currentParameter: string;
  allMapped: string;
  allMappedHint: string;
  openCatalog: string;
  loading: string;
  saving: string;
  loadError: string;
  newTitle: string;
  newDescription: string;
  technicalCode: string;
  dimension: string;
  valueType: string;
  unit: string;
  aggregation: string;
  window: string;
  allowNegative: string;
  choose: string;
  createAndAdd: string;
};

const EN: Copy = {"title":"Typical activity parameters","hint":"Build the required parameter set for the new system typical activity. Add an existing system parameter or create a missing one. After every addition, the selected set remains visible and you can add another parameter.","rule":"A system typical activity must define at least one measurable parameter. A parameter specifies which value can be recorded for a particular execution of the activity; a fact exists after a value is recorded.","selectedTitle":"Selected parameters","noneSelected":"No parameters have been selected yet.","addAdditional":"+ Add another parameter","chooseExisting":"Choose existing","createNew":"Create new","searchPlaceholder":"Search by name, code or dimensionâ€¦","noAvailable":"No matching active system parameters.","addParameter":"Add parameter","selectedBadge":"Selected","mappingReady":"Observation object for the measurement has been determined","mappingPending":"Observation object for the measurement has not been determined yet","confirmTitle":"Finish the parameter set","confirmHint":"When the set is complete, confirm it. Then process parameters one by one and determine the leaf observation object whose value each parameter measures.","confirmComment":"Decision comment","confirmCommentHint":"Briefly explain why this parameter set is sufficient for the typical activity.","confirmButton":"Confirm parameter set and continue","confirmed":"Typical activity parameter set confirmed","confirmedHint":"The set is fixed for this review step. Now determine, for every selected parameter, the leaf observation object whose value it measures.","currentParameter":"Parameter being configured","allMapped":"Observation objects for measurement determined for all parameters","allMappedHint":"This constructor section is complete. Continue to the next stage of building the system typical activity.","openCatalog":"Open parameter catalog","loading":"Loading parameter constructorâ€¦","saving":"Savingâ€¦","loadError":"Could not load or save the parameter constructor.","newTitle":"Name","newDescription":"Description","technicalCode":"Technical code","dimension":"Dimension","valueType":"Value type","unit":"Canonical unit","aggregation":"Aggregation","window":"Default window","allowNegative":"Allow negative values","choose":"Chooseâ€¦","createAndAdd":"Create system parameter and add it"};

const RU: Copy = {"title":"ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ‹ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ð¹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸","hint":"Ð¡Ñ„Ð¾Ñ€Ð¼Ð¸Ñ€ÑƒÐ¹Ñ‚Ðµ Ð½ÐµÐ¾Ð±Ñ…Ð¾Ð´Ð¸Ð¼Ñ‹Ð¹ Ð½Ð°Ð±Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð² Ð½Ð¾Ð²Ð¾Ð¹ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¾Ð¹ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ð¹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸. Ð”Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‰Ð¸Ð¹ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ñ‹Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€ Ð¸Ð»Ð¸ ÑÐ¾Ð·Ð´Ð°Ð¹Ñ‚Ðµ Ð½ÐµÐ´Ð¾ÑÑ‚Ð°ÑŽÑ‰Ð¸Ð¹. ÐŸÐ¾ÑÐ»Ðµ ÐºÐ°Ð¶Ð´Ð¾Ð³Ð¾ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ñ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ð½Ñ‹Ð¹ Ð½Ð°Ð±Ð¾Ñ€ Ð¾ÑÑ‚Ð°Ñ‘Ñ‚ÑÑ Ð²Ð¸Ð´Ð¸Ð¼Ñ‹Ð¼.","rule":"Ð”Ð»Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¾Ð¹ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ð¹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸ Ð´Ð¾Ð»Ð¶ÐµÐ½ Ð±Ñ‹Ñ‚ÑŒ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»Ñ‘Ð½ Ñ…Ð¾Ñ‚Ñ Ð±Ñ‹ Ð¾Ð´Ð¸Ð½ Ð¸Ð·Ð¼ÐµÑ€Ð¸Ð¼Ñ‹Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€. ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€ Ð·Ð°Ð´Ð°Ñ‘Ñ‚, ÐºÐ°ÐºÐ¾Ðµ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ Ð¼Ð¾Ð¶ÐµÑ‚ Ð±Ñ‹Ñ‚ÑŒ Ð·Ð°Ñ„Ð¸ÐºÑÐ¸Ñ€Ð¾Ð²Ð°Ð½Ð¾ Ð¿Ñ€Ð¸ ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ð¾Ð¼ Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÐµÐ½Ð¸Ð¸ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸; Ñ„Ð°ÐºÑ‚ Ð²Ð¾Ð·Ð½Ð¸ÐºÐ°ÐµÑ‚ Ð¿Ð¾ÑÐ»Ðµ Ð·Ð°Ð¿Ð¸ÑÐ¸ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ñ.","selectedTitle":"Ð’Ñ‹Ð±Ñ€Ð°Ð½Ð½Ñ‹Ðµ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ‹","noneSelected":"ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ‹ ÐµÑ‰Ñ‘ Ð½Ðµ Ð²Ñ‹Ð±Ñ€Ð°Ð½Ñ‹.","addAdditional":"+ Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ ÐµÑ‰Ñ‘ Ð¾Ð´Ð¸Ð½ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€","chooseExisting":"Ð’Ñ‹Ð±Ñ€Ð°Ñ‚ÑŒ ÑÑƒÑ‰ÐµÑÑ‚Ð²ÑƒÑŽÑ‰Ð¸Ð¹","createNew":"Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ Ð½Ð¾Ð²Ñ‹Ð¹","searchPlaceholder":"ÐŸÐ¾Ð¸ÑÐº Ð¿Ð¾ Ð½Ð°Ð·Ð²Ð°Ð½Ð¸ÑŽ, ÐºÐ¾Ð´Ñƒ Ð¸Ð»Ð¸ Ð¸Ð·Ð¼ÐµÑ€ÐµÐ½Ð¸ÑŽâ€¦","noAvailable":"ÐŸÐ¾Ð´Ñ…Ð¾Ð´ÑÑ‰Ð¸Ñ… Ð°ÐºÑ‚Ð¸Ð²Ð½Ñ‹Ñ… ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ñ‹Ñ… Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð² Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾.","addParameter":"Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€","selectedBadge":"Ð’Ñ‹Ð±Ñ€Ð°Ð½","mappingReady":"ÐžÐ±ÑŠÐµÐºÑ‚ Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ Ð´Ð»Ñ Ð¸Ð·Ð¼ÐµÑ€ÐµÐ½Ð¸Ñ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»Ñ‘Ð½","mappingPending":"ÐžÐ±ÑŠÐµÐºÑ‚ Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ Ð´Ð»Ñ Ð¸Ð·Ð¼ÐµÑ€ÐµÐ½Ð¸Ñ ÐµÑ‰Ñ‘ Ð½Ðµ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»Ñ‘Ð½","confirmTitle":"Ð—Ð°Ð²ÐµÑ€ÑˆÐ¸Ñ‚ÑŒ Ð½Ð°Ð±Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð²","confirmHint":"ÐšÐ¾Ð³Ð´Ð° Ð½Ð°Ð±Ð¾Ñ€ ÑÑ„Ð¾Ñ€Ð¼Ð¸Ñ€Ð¾Ð²Ð°Ð½, Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚Ðµ ÐµÐ³Ð¾. Ð—Ð°Ñ‚ÐµÐ¼ Ð¾Ð±Ñ€Ð°Ð±Ð¾Ñ‚Ð°Ð¹Ñ‚Ðµ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ‹ Ð¿Ð¾ Ð¾Ð´Ð½Ð¾Ð¼Ñƒ Ð¸ Ð´Ð»Ñ ÐºÐ°Ð¶Ð´Ð¾Ð³Ð¾ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»Ð¸Ñ‚Ðµ Ð»Ð¸ÑÑ‚Ð¾Ð²Ð¾Ð¹ Ð¾Ð±ÑŠÐµÐºÑ‚ Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ, Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ ÐºÐ¾Ñ‚Ð¾Ñ€Ð¾Ð³Ð¾ Ð¾Ð½ Ð¸Ð·Ð¼ÐµÑ€ÑÐµÑ‚.","confirmComment":"ÐšÐ¾Ð¼Ð¼ÐµÐ½Ñ‚Ð°Ñ€Ð¸Ð¹ Ðº Ñ€ÐµÑˆÐµÐ½Ð¸ÑŽ","confirmCommentHint":"ÐšÑ€Ð°Ñ‚ÐºÐ¾ Ð¾Ð±ÑŠÑÑÐ½Ð¸Ñ‚Ðµ, Ð¿Ð¾Ñ‡ÐµÐ¼Ñƒ ÑÑ‚Ð¾Ð³Ð¾ Ð½Ð°Ð±Ð¾Ñ€Ð° Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð² Ð´Ð¾ÑÑ‚Ð°Ñ‚Ð¾Ñ‡Ð½Ð¾ Ð´Ð»Ñ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ð¹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸.","confirmButton":"ÐŸÐ¾Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚ÑŒ Ð½Ð°Ð±Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð² Ð¸ Ð¿Ñ€Ð¾Ð´Ð¾Ð»Ð¶Ð¸Ñ‚ÑŒ","confirmed":"ÐÐ°Ð±Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð² Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ð¹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½","confirmedHint":"ÐÐ°Ð±Ð¾Ñ€ Ð·Ð°Ñ„Ð¸ÐºÑÐ¸Ñ€Ð¾Ð²Ð°Ð½ Ð´Ð»Ñ ÑÑ‚Ð¾Ð³Ð¾ ÑˆÐ°Ð³Ð° Ð¿Ñ€Ð¾Ð²ÐµÑ€ÐºÐ¸. Ð¢ÐµÐ¿ÐµÑ€ÑŒ Ð´Ð»Ñ ÐºÐ°Ð¶Ð´Ð¾Ð³Ð¾ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð° Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»Ð¸Ñ‚Ðµ Ð»Ð¸ÑÑ‚Ð¾Ð²Ð¾Ð¹ Ð¾Ð±ÑŠÐµÐºÑ‚ Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ, Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ ÐºÐ¾Ñ‚Ð¾Ñ€Ð¾Ð³Ð¾ Ð¾Ð½ Ð¸Ð·Ð¼ÐµÑ€ÑÐµÑ‚.","currentParameter":"ÐÐ°ÑÑ‚Ñ€Ð°Ð¸Ð²Ð°ÐµÐ¼Ñ‹Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€","allMapped":"ÐžÐ±ÑŠÐµÐºÑ‚Ñ‹ Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ Ð´Ð»Ñ Ð¸Ð·Ð¼ÐµÑ€ÐµÐ½Ð¸Ñ Ð¾Ð¿Ñ€ÐµÐ´ÐµÐ»ÐµÐ½Ñ‹ Ð´Ð»Ñ Ð²ÑÐµÑ… Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð²","allMappedHint":"Ð­Ñ‚Ð¾Ñ‚ ÑƒÑ‡Ð°ÑÑ‚Ð¾Ðº ÐºÐ¾Ð½ÑÑ‚Ñ€ÑƒÐºÑ‚Ð¾Ñ€Ð° Ð·Ð°Ð²ÐµÑ€ÑˆÑ‘Ð½. ÐœÐ¾Ð¶Ð½Ð¾ Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ð¸Ñ‚ÑŒ Ðº ÑÐ»ÐµÐ´ÑƒÑŽÑ‰ÐµÐ¼Ñƒ ÑÑ‚Ð°Ð¿Ñƒ Ð¿Ð¾ÑÑ‚Ñ€Ð¾ÐµÐ½Ð¸Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¾Ð¹ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ð¹ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ð¸.","openCatalog":"ÐžÑ‚ÐºÑ€Ñ‹Ñ‚ÑŒ ÐºÐ°Ñ‚Ð°Ð»Ð¾Ð³ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð²","loading":"Ð—Ð°Ð³Ñ€ÑƒÐ¶Ð°ÐµÐ¼ ÐºÐ¾Ð½ÑÑ‚Ñ€ÑƒÐºÑ‚Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð²â€¦","saving":"Ð¡Ð¾Ñ…Ñ€Ð°Ð½ÑÐµÐ¼â€¦","loadError":"ÐÐµ ÑƒÐ´Ð°Ð»Ð¾ÑÑŒ Ð·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ Ð¸Ð»Ð¸ ÑÐ¾Ñ…Ñ€Ð°Ð½Ð¸Ñ‚ÑŒ ÐºÐ¾Ð½ÑÑ‚Ñ€ÑƒÐºÑ‚Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¾Ð².","newTitle":"ÐÐ°Ð·Ð²Ð°Ð½Ð¸Ðµ","newDescription":"ÐžÐ¿Ð¸ÑÐ°Ð½Ð¸Ðµ","technicalCode":"Ð¢ÐµÑ…Ð½Ð¸Ñ‡ÐµÑÐºÐ¸Ð¹ ÐºÐ¾Ð´","dimension":"Ð˜Ð·Ð¼ÐµÑ€ÐµÐ½Ð¸Ðµ","valueType":"Ð¢Ð¸Ð¿ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ñ","unit":"ÐšÐ°Ð½Ð¾Ð½Ð¸Ñ‡ÐµÑÐºÐ°Ñ ÐµÐ´Ð¸Ð½Ð¸Ñ†Ð°","aggregation":"ÐÐ³Ñ€ÐµÐ³Ð°Ñ†Ð¸Ñ","window":"ÐžÐºÐ½Ð¾ Ð¿Ð¾ ÑƒÐ¼Ð¾Ð»Ñ‡Ð°Ð½Ð¸ÑŽ","allowNegative":"Ð Ð°Ð·Ñ€ÐµÑˆÐ¸Ñ‚ÑŒ Ð¾Ñ‚Ñ€Ð¸Ñ†Ð°Ñ‚ÐµÐ»ÑŒÐ½Ñ‹Ðµ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ñ","choose":"Ð’Ñ‹Ð±ÐµÑ€Ð¸Ñ‚Ðµâ€¦","createAndAdd":"Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ñ‹Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€ Ð¸ Ð´Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ"};

const PL: Copy = {"title":"Parametry aktywnoÅ›ci typowej","hint":"Zbuduj wymagany zestaw parametrÃ³w nowej systemowej aktywnoÅ›ci typowej. Dodaj istniejÄ…cy parametr systemowy albo utwÃ³rz brakujÄ…cy. Po kaÅ¼dym dodaniu wybrany zestaw pozostaje widoczny.","rule":"Dla systemowej aktywnoÅ›ci typowej trzeba okreÅ›liÄ‡ co najmniej jeden mierzalny parametr. Parametr okreÅ›la, jaka wartoÅ›Ä‡ moÅ¼e zostaÄ‡ zapisana dla konkretnego wykonania aktywnoÅ›ci; fakt powstaje po zapisaniu wartoÅ›ci.","selectedTitle":"Wybrane parametry","noneSelected":"Nie wybrano jeszcze parametrÃ³w.","addAdditional":"+ Dodaj kolejny parametr","chooseExisting":"Wybierz istniejÄ…cy","createNew":"UtwÃ³rz nowy","searchPlaceholder":"Szukaj po nazwie, kodzie lub wymiarzeâ€¦","noAvailable":"Nie znaleziono pasujÄ…cych aktywnych parametrÃ³w systemowych.","addParameter":"Dodaj parametr","selectedBadge":"Wybrano","mappingReady":"OkreÅ›lono obiekt obserwacji dla pomiaru","mappingPending":"Nie okreÅ›lono jeszcze obiektu obserwacji dla pomiaru","confirmTitle":"ZakoÅ„cz zestaw parametrÃ³w","confirmHint":"Gdy zestaw jest gotowy, potwierdÅº go. NastÄ™pnie obsÅ‚uÅ¼ parametry po kolei i dla kaÅ¼dego okreÅ›l liÅ›ciowy obiekt obserwacji, ktÃ³rego wartoÅ›Ä‡ mierzy.","confirmComment":"Komentarz do decyzji","confirmCommentHint":"KrÃ³tko wyjaÅ›nij, dlaczego ten zestaw parametrÃ³w jest wystarczajÄ…cy.","confirmButton":"PotwierdÅº zestaw i kontynuuj","confirmed":"Zestaw parametrÃ³w aktywnoÅ›ci typowej potwierdzony","confirmedHint":"Zestaw zostaÅ‚ ustalony dla tego kroku. Teraz dla kaÅ¼dego parametru okreÅ›l liÅ›ciowy obiekt obserwacji, ktÃ³rego wartoÅ›Ä‡ mierzy.","currentParameter":"Konfigurowany parametr","allMapped":"OkreÅ›lono obiekty obserwacji dla wszystkich pomiarÃ³w","allMappedHint":"Ta czÄ™Å›Ä‡ konstruktora jest zakoÅ„czona. MoÅ¼na przejÅ›Ä‡ do kolejnego etapu.","openCatalog":"OtwÃ³rz katalog parametrÃ³w","loading":"Wczytywanie konstruktora parametrÃ³wâ€¦","saving":"Zapisywanieâ€¦","loadError":"Nie udaÅ‚o siÄ™ wczytaÄ‡ lub zapisaÄ‡ konstruktora parametrÃ³w.","newTitle":"Nazwa","newDescription":"Opis","technicalCode":"Kod techniczny","dimension":"Wymiar","valueType":"Typ wartoÅ›ci","unit":"Jednostka kanoniczna","aggregation":"Agregacja","window":"DomyÅ›lne okno","allowNegative":"DopuÅ›Ä‡ wartoÅ›ci ujemne","choose":"Wybierzâ€¦","createAndAdd":"UtwÃ³rz parametr systemowy i dodaj"};

const UK: Copy = {"title":"ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¸ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ñ— Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ–","hint":"Ð¡Ñ„Ð¾Ñ€Ð¼ÑƒÐ¹Ñ‚Ðµ Ð½ÐµÐ¾Ð±Ñ…Ñ–Ð´Ð½Ð¸Ð¹ Ð½Ð°Ð±Ñ–Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð² Ð½Ð¾Ð²Ð¾Ñ— ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¾Ñ— Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ñ— Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ–. Ð”Ð¾Ð´Ð°Ð¹Ñ‚Ðµ Ð½Ð°ÑÐ²Ð½Ð¸Ð¹ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¸Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€ Ð°Ð±Ð¾ ÑÑ‚Ð²Ð¾Ñ€Ñ–Ñ‚ÑŒ Ð²Ñ–Ð´ÑÑƒÑ‚Ð½Ñ–Ð¹. ÐŸÑ–ÑÐ»Ñ ÐºÐ¾Ð¶Ð½Ð¾Ð³Ð¾ Ð´Ð¾Ð´Ð°Ð²Ð°Ð½Ð½Ñ Ð²Ð¸Ð±Ñ€Ð°Ð½Ð¸Ð¹ Ð½Ð°Ð±Ñ–Ñ€ Ð·Ð°Ð»Ð¸ÑˆÐ°Ñ”Ñ‚ÑŒÑÑ Ð²Ð¸Ð´Ð¸Ð¼Ð¸Ð¼.","rule":"Ð”Ð»Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¾Ñ— Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ñ— Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ– Ð¼Ð°Ñ” Ð±ÑƒÑ‚Ð¸ Ð²Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾ Ñ‰Ð¾Ð½Ð°Ð¹Ð¼ÐµÐ½ÑˆÐµ Ð¾Ð´Ð¸Ð½ Ð²Ð¸Ð¼Ñ–Ñ€ÑŽÐ²Ð°Ð½Ð¸Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€. ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€ Ð²Ð¸Ð·Ð½Ð°Ñ‡Ð°Ñ”, ÑÐºÐµ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ Ð¼Ð¾Ð¶Ð½Ð° Ð·Ð°Ñ„Ñ–ÐºÑÑƒÐ²Ð°Ñ‚Ð¸ Ð¿Ñ–Ð´ Ñ‡Ð°Ñ ÐºÐ¾Ð½ÐºÑ€ÐµÑ‚Ð½Ð¾Ð³Ð¾ Ð²Ð¸ÐºÐ¾Ð½Ð°Ð½Ð½Ñ Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ–; Ñ„Ð°ÐºÑ‚ Ð²Ð¸Ð½Ð¸ÐºÐ°Ñ” Ð¿Ñ–ÑÐ»Ñ Ð·Ð°Ð¿Ð¸ÑÑƒ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ.","selectedTitle":"Ð’Ð¸Ð±Ñ€Ð°Ð½Ñ– Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¸","noneSelected":"ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¸ Ñ‰Ðµ Ð½Ðµ Ð²Ð¸Ð±Ñ€Ð°Ð½Ð¾.","addAdditional":"+ Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ñ‰Ðµ Ð¾Ð´Ð¸Ð½ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€","chooseExisting":"Ð’Ð¸Ð±Ñ€Ð°Ñ‚Ð¸ Ð½Ð°ÑÐ²Ð½Ð¸Ð¹","createNew":"Ð¡Ñ‚Ð²Ð¾Ñ€Ð¸Ñ‚Ð¸ Ð½Ð¾Ð²Ð¸Ð¹","searchPlaceholder":"ÐŸÐ¾ÑˆÑƒÐº Ð·Ð° Ð½Ð°Ð·Ð²Ð¾ÑŽ, ÐºÐ¾Ð´Ð¾Ð¼ Ð°Ð±Ð¾ Ð²Ð¸Ð¼Ñ–Ñ€Ð¾Ð¼â€¦","noAvailable":"Ð’Ñ–Ð´Ð¿Ð¾Ð²Ñ–Ð´Ð½Ð¸Ñ… Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¸Ñ… ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¸Ñ… Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð² Ð½Ðµ Ð·Ð½Ð°Ð¹Ð´ÐµÐ½Ð¾.","addParameter":"Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€","selectedBadge":"Ð’Ð¸Ð±Ñ€Ð°Ð½Ð¾","mappingReady":"ÐžÐ±â€™Ñ”ÐºÑ‚ ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ Ð´Ð»Ñ Ð²Ð¸Ð¼Ñ–Ñ€ÑŽÐ²Ð°Ð½Ð½Ñ Ð²Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾","mappingPending":"ÐžÐ±â€™Ñ”ÐºÑ‚ ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ Ð´Ð»Ñ Ð²Ð¸Ð¼Ñ–Ñ€ÑŽÐ²Ð°Ð½Ð½Ñ Ñ‰Ðµ Ð½Ðµ Ð²Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾","confirmTitle":"Ð—Ð°Ð²ÐµÑ€ÑˆÐ¸Ñ‚Ð¸ Ð½Ð°Ð±Ñ–Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð²","confirmHint":"ÐšÐ¾Ð»Ð¸ Ð½Ð°Ð±Ñ–Ñ€ ÑÑ„Ð¾Ñ€Ð¼Ð¾Ð²Ð°Ð½Ð¾, Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´ÑŒÑ‚Ðµ Ð¹Ð¾Ð³Ð¾. ÐŸÐ¾Ñ‚Ñ–Ð¼ Ð¾Ð¿Ñ€Ð°Ñ†ÑŒÐ¾Ð²ÑƒÐ¹Ñ‚Ðµ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð¸ Ð¿Ð¾ Ð¾Ð´Ð½Ð¾Ð¼Ñƒ Ð¹ Ð´Ð»Ñ ÐºÐ¾Ð¶Ð½Ð¾Ð³Ð¾ Ð²Ð¸Ð·Ð½Ð°Ñ‡Ñ‚Ðµ Ð»Ð¸ÑÑ‚Ð¾Ð²Ð¸Ð¹ Ð¾Ð±â€™Ñ”ÐºÑ‚ ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ, Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ ÑÐºÐ¾Ð³Ð¾ Ð²Ñ–Ð½ Ð²Ð¸Ð¼Ñ–Ñ€ÑŽÑ”.","confirmComment":"ÐšÐ¾Ð¼ÐµÐ½Ñ‚Ð°Ñ€ Ð´Ð¾ Ñ€Ñ–ÑˆÐµÐ½Ð½Ñ","confirmCommentHint":"ÐšÐ¾Ñ€Ð¾Ñ‚ÐºÐ¾ Ð¿Ð¾ÑÑÐ½Ñ–Ñ‚ÑŒ, Ñ‡Ð¾Ð¼Ñƒ Ñ†ÑŒÐ¾Ð³Ð¾ Ð½Ð°Ð±Ð¾Ñ€Ñƒ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð² Ð´Ð¾ÑÑ‚Ð°Ñ‚Ð½ÑŒÐ¾ Ð´Ð»Ñ Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ñ— Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ–.","confirmButton":"ÐŸÑ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¸Ñ‚Ð¸ Ð½Ð°Ð±Ñ–Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð² Ñ– Ð¿Ñ€Ð¾Ð´Ð¾Ð²Ð¶Ð¸Ñ‚Ð¸","confirmed":"ÐÐ°Ð±Ñ–Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð² Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ñ— Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ– Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾","confirmedHint":"ÐÐ°Ð±Ñ–Ñ€ Ð·Ð°Ñ„Ñ–ÐºÑÐ¾Ð²Ð°Ð½Ð¾ Ð´Ð»Ñ Ñ†ÑŒÐ¾Ð³Ð¾ ÐµÑ‚Ð°Ð¿Ñƒ Ð¿ÐµÑ€ÐµÐ²Ñ–Ñ€ÐºÐ¸. Ð¢ÐµÐ¿ÐµÑ€ Ð´Ð»Ñ ÐºÐ¾Ð¶Ð½Ð¾Ð³Ð¾ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð° Ð²Ð¸Ð·Ð½Ð°Ñ‡Ñ‚Ðµ Ð»Ð¸ÑÑ‚Ð¾Ð²Ð¸Ð¹ Ð¾Ð±â€™Ñ”ÐºÑ‚ ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ, Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ ÑÐºÐ¾Ð³Ð¾ Ð²Ñ–Ð½ Ð²Ð¸Ð¼Ñ–Ñ€ÑŽÑ”.","currentParameter":"ÐŸÐ°Ñ€Ð°Ð¼ÐµÑ‚Ñ€, Ñ‰Ð¾ Ð½Ð°Ð»Ð°ÑˆÑ‚Ð¾Ð²ÑƒÑ”Ñ‚ÑŒÑÑ","allMapped":"ÐžÐ±â€™Ñ”ÐºÑ‚Ð¸ ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ Ð´Ð»Ñ Ð²Ð¸Ð¼Ñ–Ñ€ÑŽÐ²Ð°Ð½Ð½Ñ Ð²Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾ Ð´Ð»Ñ Ð²ÑÑ–Ñ… Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð²","allMappedHint":"Ð¦ÑŽ Ñ‡Ð°ÑÑ‚Ð¸Ð½Ñƒ ÐºÐ¾Ð½ÑÑ‚Ñ€ÑƒÐºÑ‚Ð¾Ñ€Ð° Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð¾. ÐœÐ¾Ð¶Ð½Ð° Ð¿ÐµÑ€ÐµÑ…Ð¾Ð´Ð¸Ñ‚Ð¸ Ð´Ð¾ Ð½Ð°ÑÑ‚ÑƒÐ¿Ð½Ð¾Ð³Ð¾ ÐµÑ‚Ð°Ð¿Ñƒ ÑÑ‚Ð²Ð¾Ñ€ÐµÐ½Ð½Ñ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¾Ñ— Ñ‚Ð¸Ð¿Ð¾Ð²Ð¾Ñ— Ð°ÐºÑ‚Ð¸Ð²Ð½Ð¾ÑÑ‚Ñ–.","openCatalog":"Ð’Ñ–Ð´ÐºÑ€Ð¸Ñ‚Ð¸ ÐºÐ°Ñ‚Ð°Ð»Ð¾Ð³ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð²","loading":"Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÑƒÑ”Ð¼Ð¾ ÐºÐ¾Ð½ÑÑ‚Ñ€ÑƒÐºÑ‚Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð²â€¦","saving":"Ð—Ð±ÐµÑ€Ñ–Ð³Ð°Ñ”Ð¼Ð¾â€¦","loadError":"ÐÐµ Ð²Ð´Ð°Ð»Ð¾ÑÑ Ð·Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶Ð¸Ñ‚Ð¸ Ð°Ð±Ð¾ Ð·Ð±ÐµÑ€ÐµÐ³Ñ‚Ð¸ ÐºÐ¾Ð½ÑÑ‚Ñ€ÑƒÐºÑ‚Ð¾Ñ€ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ñ–Ð².","newTitle":"ÐÐ°Ð·Ð²Ð°","newDescription":"ÐžÐ¿Ð¸Ñ","technicalCode":"Ð¢ÐµÑ…Ð½Ñ–Ñ‡Ð½Ð¸Ð¹ ÐºÐ¾Ð´","dimension":"Ð’Ð¸Ð¼Ñ–Ñ€","valueType":"Ð¢Ð¸Ð¿ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ","unit":"ÐšÐ°Ð½Ð¾Ð½Ñ–Ñ‡Ð½Ð° Ð¾Ð´Ð¸Ð½Ð¸Ñ†Ñ","aggregation":"ÐÐ³Ñ€ÐµÐ³Ð°Ñ†Ñ–Ñ","window":"Ð’Ñ–ÐºÐ½Ð¾ Ð·Ð° Ð·Ð°Ð¼Ð¾Ð²Ñ‡ÑƒÐ²Ð°Ð½Ð½ÑÐ¼","allowNegative":"Ð”Ð¾Ð·Ð²Ð¾Ð»Ð¸Ñ‚Ð¸ Ð²Ñ–Ð´â€™Ñ”Ð¼Ð½Ñ– Ð·Ð½Ð°Ñ‡ÐµÐ½Ð½Ñ","choose":"Ð’Ð¸Ð±ÐµÑ€Ñ–Ñ‚ÑŒâ€¦","createAndAdd":"Ð¡Ñ‚Ð²Ð¾Ñ€Ð¸Ñ‚Ð¸ ÑÐ¸ÑÑ‚ÐµÐ¼Ð½Ð¸Ð¹ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€ Ñ– Ð´Ð¾Ð´Ð°Ñ‚Ð¸"};

const DE: Copy = {"title":"Parameter der typischen AktivitÃ¤t","hint":"Stellen Sie den erforderlichen Parametersatz fÃ¼r die neue systemweite typische AktivitÃ¤t zusammen. FÃ¼gen Sie einen vorhandenen Systemparameter hinzu oder erstellen Sie einen fehlenden. Der gewÃ¤hlte Satz bleibt sichtbar.","rule":"FÃ¼r eine systemweite typische AktivitÃ¤t muss mindestens ein messbarer Parameter festgelegt sein. Ein Parameter bestimmt, welcher Wert bei einer konkreten AusfÃ¼hrung erfasst werden kann; ein Fakt entsteht nach dem Speichern eines Werts.","selectedTitle":"AusgewÃ¤hlte Parameter","noneSelected":"Noch keine Parameter ausgewÃ¤hlt.","addAdditional":"+ Weiteren Parameter hinzufÃ¼gen","chooseExisting":"Vorhandenen auswÃ¤hlen","createNew":"Neu erstellen","searchPlaceholder":"Nach Name, Code oder Dimension suchenâ€¦","noAvailable":"Keine passenden aktiven Systemparameter gefunden.","addParameter":"Parameter hinzufÃ¼gen","selectedBadge":"AusgewÃ¤hlt","mappingReady":"Beobachtungsobjekt fÃ¼r die Messung bestimmt","mappingPending":"Beobachtungsobjekt fÃ¼r die Messung noch nicht bestimmt","confirmTitle":"Parametersatz abschlieÃŸen","confirmHint":"BestÃ¤tigen Sie den vollstÃ¤ndigen Satz. Bearbeiten Sie danach die Parameter einzeln und bestimmen Sie jeweils das Blatt-Beobachtungsobjekt, dessen Wert gemessen wird.","confirmComment":"Entscheidungskommentar","confirmCommentHint":"BegrÃ¼nden Sie kurz, warum dieser Parametersatz ausreicht.","confirmButton":"Parametersatz bestÃ¤tigen und fortfahren","confirmed":"Parametersatz der typischen AktivitÃ¤t bestÃ¤tigt","confirmedHint":"Der Satz ist fÃ¼r diesen PrÃ¼fschritt festgelegt. Bestimmen Sie nun fÃ¼r jeden Parameter das Blatt-Beobachtungsobjekt, dessen Wert er misst.","currentParameter":"Konfigurierter Parameter","allMapped":"Beobachtungsobjekte fÃ¼r alle Messungen bestimmt","allMappedHint":"Dieser Abschnitt ist abgeschlossen. Sie kÃ¶nnen mit der nÃ¤chsten Phase fortfahren.","openCatalog":"Parameterkatalog Ã¶ffnen","loading":"Parameterkonstruktor wird geladenâ€¦","saving":"Speichernâ€¦","loadError":"Parameterkonstruktor konnte nicht geladen oder gespeichert werden.","newTitle":"Name","newDescription":"Beschreibung","technicalCode":"Technischer Code","dimension":"Dimension","valueType":"Werttyp","unit":"Kanonische Einheit","aggregation":"Aggregation","window":"Standardfenster","allowNegative":"Negative Werte erlauben","choose":"AuswÃ¤hlenâ€¦","createAndAdd":"Systemparameter erstellen und hinzufÃ¼gen"};

const ES: Copy = {"title":"ParÃ¡metros de la actividad tÃ­pica","hint":"Defina el conjunto de parÃ¡metros necesario para la nueva actividad tÃ­pica del sistema. AÃ±ada un parÃ¡metro existente o cree uno que falte. El conjunto seleccionado permanece visible.","rule":"Una actividad tÃ­pica del sistema debe tener al menos un parÃ¡metro medible definido. El parÃ¡metro determina quÃ© valor puede registrarse para una ejecuciÃ³n concreta; el hecho existe despuÃ©s de registrar un valor.","selectedTitle":"ParÃ¡metros seleccionados","noneSelected":"TodavÃ­a no se ha seleccionado ningÃºn parÃ¡metro.","addAdditional":"+ AÃ±adir otro parÃ¡metro","chooseExisting":"Elegir existente","createNew":"Crear nuevo","searchPlaceholder":"Buscar por nombre, cÃ³digo o dimensiÃ³nâ€¦","noAvailable":"No se encontraron parÃ¡metros activos que coincidan.","addParameter":"AÃ±adir parÃ¡metro","selectedBadge":"Seleccionado","mappingReady":"Objeto de observaciÃ³n para la mediciÃ³n determinado","mappingPending":"El objeto de observaciÃ³n para la mediciÃ³n aÃºn no estÃ¡ determinado","confirmTitle":"Finalizar el conjunto de parÃ¡metros","confirmHint":"Confirme el conjunto cuando estÃ© completo. DespuÃ©s procese los parÃ¡metros uno a uno y determine para cada uno el objeto de observaciÃ³n hoja cuyo valor mide.","confirmComment":"Comentario de la decisiÃ³n","confirmCommentHint":"Explique brevemente por quÃ© este conjunto es suficiente.","confirmButton":"Confirmar el conjunto y continuar","confirmed":"Conjunto de parÃ¡metros confirmado","confirmedHint":"El conjunto queda fijado para este paso. Ahora determine para cada parÃ¡metro el objeto de observaciÃ³n hoja cuyo valor mide.","currentParameter":"ParÃ¡metro en configuraciÃ³n","allMapped":"Objetos de observaciÃ³n determinados para todas las mediciones","allMappedHint":"Esta parte del constructor estÃ¡ completa. Puede continuar con la siguiente etapa.","openCatalog":"Abrir catÃ¡logo de parÃ¡metros","loading":"Cargando constructor de parÃ¡metrosâ€¦","saving":"Guardandoâ€¦","loadError":"No se pudo cargar o guardar el constructor de parÃ¡metros.","newTitle":"Nombre","newDescription":"DescripciÃ³n","technicalCode":"CÃ³digo tÃ©cnico","dimension":"DimensiÃ³n","valueType":"Tipo de valor","unit":"Unidad canÃ³nica","aggregation":"AgregaciÃ³n","window":"Ventana predeterminada","allowNegative":"Permitir valores negativos","choose":"Elegirâ€¦","createAndAdd":"Crear parÃ¡metro del sistema y aÃ±adirlo"};

const CS: Copy = {"title":"Parametry typickÃ© aktivity","hint":"Sestavte poÅ¾adovanou sadu parametrÅ¯ pro novou systÃ©movou typickou aktivitu. PÅ™idejte existujÃ­cÃ­ systÃ©movÃ½ parametr nebo vytvoÅ™te chybÄ›jÃ­cÃ­. VybranÃ¡ sada zÅ¯stÃ¡vÃ¡ viditelnÃ¡.","rule":"Pro systÃ©movou typickou aktivitu musÃ­ bÃ½t urÄen alespoÅˆ jeden mÄ›Å™itelnÃ½ parametr. Parametr urÄuje, jakou hodnotu lze zaznamenat pro konkrÃ©tnÃ­ provedenÃ­; fakt vznikÃ¡ po uloÅ¾enÃ­ hodnoty.","selectedTitle":"VybranÃ© parametry","noneSelected":"ZatÃ­m nebyl vybrÃ¡n Å¾Ã¡dnÃ½ parametr.","addAdditional":"+ PÅ™idat dalÅ¡Ã­ parametr","chooseExisting":"Vybrat existujÃ­cÃ­","createNew":"VytvoÅ™it novÃ½","searchPlaceholder":"Hledat podle nÃ¡zvu, kÃ³du nebo rozmÄ›ruâ€¦","noAvailable":"Nebyly nalezeny odpovÃ­dajÃ­cÃ­ aktivnÃ­ systÃ©movÃ© parametry.","addParameter":"PÅ™idat parametr","selectedBadge":"VybrÃ¡no","mappingReady":"Objekt pozorovÃ¡nÃ­ pro mÄ›Å™enÃ­ byl urÄen","mappingPending":"Objekt pozorovÃ¡nÃ­ pro mÄ›Å™enÃ­ zatÃ­m nebyl urÄen","confirmTitle":"DokonÄit sadu parametrÅ¯","confirmHint":"Jakmile je sada kompletnÃ­, potvrÄte ji. PotÃ© zpracujte parametry postupnÄ› a pro kaÅ¾dÃ½ urÄete listovÃ½ objekt pozorovÃ¡nÃ­, jehoÅ¾ hodnotu mÄ›Å™Ã­.","confirmComment":"KomentÃ¡Å™ k rozhodnutÃ­","confirmCommentHint":"StruÄnÄ› vysvÄ›tlete, proÄ je tato sada dostaÄujÃ­cÃ­.","confirmButton":"Potvrdit sadu a pokraÄovat","confirmed":"Sada parametrÅ¯ typickÃ© aktivity potvrzena","confirmedHint":"Sada je pro tento krok pevnÄ› nastavena. NynÃ­ pro kaÅ¾dÃ½ parametr urÄete listovÃ½ objekt pozorovÃ¡nÃ­, jehoÅ¾ hodnotu mÄ›Å™Ã­.","currentParameter":"NastavovanÃ½ parametr","allMapped":"Objekty pozorovÃ¡nÃ­ urÄeny pro vÅ¡echna mÄ›Å™enÃ­","allMappedHint":"Tato ÄÃ¡st konstruktoru je dokonÄena. MÅ¯Å¾ete pokraÄovat dalÅ¡Ã­ fÃ¡zÃ­.","openCatalog":"OtevÅ™Ã­t katalog parametrÅ¯","loading":"NaÄÃ­tÃ¡nÃ­ konstruktoru parametrÅ¯â€¦","saving":"UklÃ¡dÃ¡nÃ­â€¦","loadError":"Konstruktor parametrÅ¯ se nepodaÅ™ilo naÄÃ­st nebo uloÅ¾it.","newTitle":"NÃ¡zev","newDescription":"Popis","technicalCode":"TechnickÃ½ kÃ³d","dimension":"RozmÄ›r","valueType":"Typ hodnoty","unit":"KanonickÃ¡ jednotka","aggregation":"Agregace","window":"VÃ½chozÃ­ okno","allowNegative":"Povolit zÃ¡pornÃ© hodnoty","choose":"Vyberteâ€¦","createAndAdd":"VytvoÅ™it systÃ©movÃ½ parametr a pÅ™idat"};

const COPY: Record<LocaleCode, Copy> = {
  en: EN,
  ru: RU,
  pl: PL,
  uk: UK,
  de: DE,
  es: ES,
  cs: CS,
};

const MULTI_MAPPING_COPY: Record<
  LocaleCode,
  {
    mappedCount: string;
    addMore: string;
    confirmSet: string;
    setConfirmed: string;
  }
> = {
  en: {
    mappedCount: "Mapped leaf observation objects",
    addMore: "+ Add another observation object",
    confirmSet: "All observation objects for this parameter are assigned",
    setConfirmed: "Observation-object set confirmed",
  },
  ru: {
    mappedCount: "ÐÐ°Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾ Ð»Ð¸ÑÑ‚Ð¾Ð²Ñ‹Ñ… Ð¾Ð±ÑŠÐµÐºÑ‚Ð¾Ð² Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ",
    addMore: "+ Ð”Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ ÐµÑ‰Ñ‘ ÐžÐ",
    confirmSet: "Ð’ÑÐµ ÐžÐ ÑÑ‚Ð¾Ð³Ð¾ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð° Ð½Ð°Ð·Ð½Ð°Ñ‡ÐµÐ½Ñ‹",
    setConfirmed: "ÐÐ°Ð±Ð¾Ñ€ Ð¾Ð±ÑŠÐµÐºÑ‚Ð¾Ð² Ð½Ð°Ð±Ð»ÑŽÐ´ÐµÐ½Ð¸Ñ Ð¿Ð¾Ð´Ñ‚Ð²ÐµÑ€Ð¶Ð´Ñ‘Ð½",
  },
  pl: {
    mappedCount: "Przypisane liÅ›ciowe obiekty obserwacji",
    addMore: "+ Dodaj kolejny obiekt obserwacji",
    confirmSet: "Wszystkie obiekty obserwacji tego parametru sÄ… przypisane",
    setConfirmed: "Zestaw obiektÃ³w obserwacji potwierdzony",
  },
  uk: {
    mappedCount: "ÐŸÑ€Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾ Ð»Ð¸ÑÑ‚Ð¾Ð²Ð¸Ñ… Ð¾Ð±â€™Ñ”ÐºÑ‚Ñ–Ð² ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ",
    addMore: "+ Ð”Ð¾Ð´Ð°Ñ‚Ð¸ Ñ‰Ðµ Ð¾Ð´Ð¸Ð½ ÐžÐ",
    confirmSet: "Ð£ÑÑ– ÐžÐ Ñ†ÑŒÐ¾Ð³Ð¾ Ð¿Ð°Ñ€Ð°Ð¼ÐµÑ‚Ñ€Ð° Ð¿Ñ€Ð¸Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¾",
    setConfirmed: "ÐÐ°Ð±Ñ–Ñ€ Ð¾Ð±â€™Ñ”ÐºÑ‚Ñ–Ð² ÑÐ¿Ð¾ÑÑ‚ÐµÑ€ÐµÐ¶ÐµÐ½Ð½Ñ Ð¿Ñ–Ð´Ñ‚Ð²ÐµÑ€Ð´Ð¶ÐµÐ½Ð¾",
  },
  de: {
    mappedCount: "Zugeordnete Blatt-Beobachtungsobjekte",
    addMore: "+ Weiteres Beobachtungsobjekt hinzufÃ¼gen",
    confirmSet: "Alle Beobachtungsobjekte dieses Parameters sind zugeordnet",
    setConfirmed: "Beobachtungsobjekt-Satz bestÃ¤tigt",
  },
  es: {
    mappedCount: "Objetos de observaciÃ³n hoja asignados",
    addMore: "+ AÃ±adir otro objeto de observaciÃ³n",
    confirmSet: "Todos los objetos de observaciÃ³n de este parÃ¡metro estÃ¡n asignados",
    setConfirmed: "Conjunto de objetos de observaciÃ³n confirmado",
  },
  cs: {
    mappedCount: "PÅ™iÅ™azenÃ© listovÃ© objekty pozorovÃ¡nÃ­",
    addMore: "+ PÅ™idat dalÅ¡Ã­ objekt pozorovÃ¡nÃ­",
    confirmSet: "VÅ¡echny objekty pozorovÃ¡nÃ­ tohoto parametru jsou pÅ™iÅ™azeny",
    setConfirmed: "Sada objektÅ¯ pozorovÃ¡nÃ­ potvrzena",
  },
};

const DIMENSIONS = [
  "time",
  "distance",
  "count",
  "volume",
  "mass",
  "energy",
  "money",
  "rate",
  "score",
  "temperature",
  "text",
  "boolean",
  "timestamp",
  "pressure",
  "ratio",
  "sound_level",
  "illuminance",
] as const;

const VALUE_TYPES = ["numeric", "text", "boolean", "timestamp"] as const;
const AGGREGATIONS = [
  "sum",
  "average",
  "minimum",
  "maximum",
  "latest",
  "count",
  "duration",
  "rate",
  "none",
] as const;
const WINDOWS = [
  "event",
  "hour",
  "day",
  "week",
  "month",
  "rolling_7_days",
  "rolling_30_days",
] as const;

function localized(
  ru: string | null | undefined,
  en: string | null | undefined,
  locale: LocaleCode,
) {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function parameterMeta(item: ParameterItem) {
  return [
    item.parameterCode,
    item.dimensionCode,
    item.valueTypeCode,
    item.canonicalUnitLabel || item.canonicalUnitCode,
  ]
    .filter(Boolean)
    .join(" Â· ");
}

export function CuratorTemplateParameters({ signalId, locale, onChanged }: Props) {
  const copy = COPY[locale] ?? COPY.en;
  const multiCopy = MULTI_MAPPING_COPY[locale] ?? MULTI_MAPPING_COPY.en;
  const [state, setState] = useState<ParameterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("existing");
  const [search, setSearch] = useState("");
  const [confirmComment, setConfirmComment] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDimension, setNewDimension] = useState("");
  const [newValueType, setNewValueType] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newAggregation, setNewAggregation] = useState("");
  const [newWindow, setNewWindow] = useState("");
  const [newAllowNegative, setNewAllowNegative] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const requestUrl =
      `/api/admin/reality-curator/signals/template-parameters?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`;

    void fetch(requestUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ParameterState | null;
        if (!response.ok || !payload?.ok) {
          throw new Error(
            payload?.error || payload?.errorCode || `HTTP_${response.status}`,
          );
        }
        setState(payload);
        setAdding((payload.selected?.length ?? 0) === 0);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "UNKNOWN");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [locale, signalId]);

  async function reload() {
    const response = await fetch(
      `/api/admin/reality-curator/signals/template-parameters?signalId=${encodeURIComponent(signalId)}&locale=${encodeURIComponent(locale)}`,
      { method: "GET", cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as ParameterState | null;
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
    }
    setState(payload);
    return payload;
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/admin/reality-curator/signals/template-parameters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signalId, locale, ...body }),
        },
      );
      const payload = (await response.json().catch(() => null)) as ParameterState | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || payload?.errorCode || `HTTP_${response.status}`);
      }
      setState(payload);
      setAdding(false);
      setSearch("");
      onChanged();
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createAndAddParameter() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/activity-parameter-definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          parameterCode: newCode,
          dimensionCode: newDimension,
          valueTypeCode: newValueType,
          canonicalUnitCode: newUnit,
          allowedUnitCodes: newUnit ? [newUnit] : [],
          aggregationMethodCode: newAggregation,
          defaultWindowCode: newWindow,
          allowNegative: newAllowNegative,
        }),
      });
      const created = (await response.json().catch(() => null)) as CreatedParameterResponse | null;
      if (!response.ok || !created?.ok || !created.definition?.id) {
        throw new Error(
          created?.error || created?.errorCode || `HTTP_${response.status}`,
        );
      }

      const selectResponse = await fetch(
        "/api/admin/reality-curator/signals/template-parameters",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signalId,
            locale,
            action: "select_parameter",
            parameterDefinitionId: created.definition.id,
            selectionSource: "created",
          }),
        },
      );
      const selected = (await selectResponse.json().catch(() => null)) as ParameterState | null;
      if (!selectResponse.ok || !selected?.ok) {
        throw new Error(
          selected?.error || selected?.errorCode || `HTTP_${selectResponse.status}`,
        );
      }

      setState(selected);
      setAdding(false);
      setNewTitle("");
      setNewDescription("");
      setNewCode("");
      setNewDimension("");
      setNewValueType("");
      setNewUnit("");
      setNewAggregation("");
      setNewWindow("");
      setNewAllowNegative(false);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "UNKNOWN");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4 text-sm text-[#727991]">
        {copy.loading}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {copy.loadError} {error}
      </div>
    );
  }

  const selected = state.selected ?? [];
  const available = state.available ?? [];
  const query = search.trim().toLowerCase();
  const filtered = query
    ? available.filter((item) =>
        [
          item.title,
          item.parameterCode,
          item.dimensionCode,
          item.valueTypeCode,
          item.canonicalUnitCode,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
    : available;

  const newParameterValid = Boolean(
    newTitle.trim() &&
      /^[a-z][a-z0-9_]{1,79}$/.test(newCode.trim()) &&
      newDimension &&
      newValueType &&
      /^[a-z][a-z0-9_]{0,79}$/.test(newUnit.trim()) &&
      newAggregation &&
      newWindow,
  );

  if (state.confirmed) {
    const nextParameter = selected.find((item) => !item.mappingCompleted) ?? null;

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="text-sm font-extrabold text-emerald-900">{copy.confirmed}</div>
          <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.confirmedHint}</div>
        </div>

        <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
          <div className="text-sm font-extrabold text-[#263044]">{copy.selectedTitle}</div>
          <div className="mt-3 space-y-2">
            {selected.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#d8def0] bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                    <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.mappingCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                    {item.mappingCompleted ? copy.mappingReady : copy.mappingPending}
                  </span>
                </div>
                {item.mappingCount > 0 ? (
                  <div className="mt-2 space-y-1 text-xs leading-5 text-[#65708d]">
                    <div className="font-bold">
                      {multiCopy.mappedCount}: {item.mappingCount}
                    </div>
                    {item.mappings.map((mapping) => (
                      <div key={mapping.valueObjectId}>
                        â€¢ {mapping.title || localized(mapping.summaryRu, mapping.summaryEn, locale) || mapping.valueObjectId}
                      </div>
                    ))}
                    {item.mappingCompleted ? (
                      <div className="font-bold text-emerald-700">{multiCopy.setConfirmed}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {nextParameter ? (
          <>
            <CuratorObjectBootstrap
              key={`${nextParameter.id}:${nextParameter.mappingIteration}`}
              signalId={signalId}
              locale={locale}
              parameterDefinitionId={nextParameter.id}
              parameterTitle={nextParameter.title}
              parameterCode={nextParameter.parameterCode}
              onChanged={() => {
                void reload().catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : "UNKNOWN");
                });
                onChanged();
              }}
            />
            {nextParameter.mappingCount > 0 ? (
              <div className="rounded-2xl border border-[#dce3f5] bg-white p-4">
                <div className="text-xs font-bold text-[#65708d]">
                  {multiCopy.mappedCount}: {nextParameter.mappingCount}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void post({
                        action: "continue_measurable_object_mapping",
                        parameterDefinitionId: nextParameter.id,
                      })
                    }
                    className="inline-flex min-h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 py-2 text-sm font-bold text-[#34405a] disabled:opacity-40"
                  >
                    {busy ? copy.saving : multiCopy.addMore}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void post({
                        action: "confirm_measurable_object_mapping_set",
                        parameterDefinitionId: nextParameter.id,
                      })
                    }
                    className="inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                  >
                    {busy ? copy.saving : multiCopy.confirmSet}
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="text-sm font-extrabold text-emerald-900">{copy.allMapped}</div>
            <div className="mt-1 text-xs leading-5 text-emerald-800">{copy.allMappedHint}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#dce3f5] bg-[#f8faff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-[#263044]">{copy.title}</div>
          <div className="mt-1 max-w-4xl text-xs leading-5 text-[#727991]">{copy.hint}</div>
        </div>
        <Link
          href={`/activity-templates?locale=${locale}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 text-xs font-bold text-[#34405a]"
        >
          {copy.openCatalog}
        </Link>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        {copy.rule}
      </div>

      <div className="mt-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#65708d]">
        {copy.selectedTitle}
      </div>
      {selected.length === 0 ? (
        <div className="mt-2 rounded-xl border border-dashed border-[#d8def0] bg-white px-3 py-4 text-xs text-[#7c8099]">
          {copy.noneSelected}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {selected.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#d8def0] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                  <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                </div>
                <span className="rounded-full bg-[#eef3ff] px-2 py-1 text-[10px] font-bold text-[#3157b8]">
                  {copy.selectedBadge}
                </span>
              </div>
              {item.description ? (
                <div className="mt-2 text-xs leading-5 text-[#65708d]">{item.description}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!adding && selected.length > 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-[#cfd8ef] bg-white px-3 py-2 text-sm font-bold text-[#34405a] disabled:opacity-40"
        >
          {copy.addAdditional}
        </button>
      ) : null}

      {adding ? (
        <div className="mt-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddMode("existing")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${addMode === "existing" ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}
            >
              {copy.chooseExisting}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAddMode("new")}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${addMode === "new" ? "border-[#3b6ef8] bg-[#eef3ff] text-[#234aa8]" : "border-[#d8def0] bg-white text-[#34405a]"}`}
            >
              {copy.createNew}
            </button>
          </div>

          {addMode === "existing" ? (
            <div className="mt-3 space-y-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
              />
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#d8def0] px-3 py-4 text-xs text-[#7c8099]">
                  {copy.noAvailable}
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filtered.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e8f3] p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#263044]">{item.title}</div>
                        <div className="mt-1 text-[11px] text-[#7c8099]">{parameterMeta(item)}</div>
                        {item.description ? (
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#65708d]">{item.description}</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void post({
                            action: "select_parameter",
                            parameterDefinitionId: item.id,
                            selectionSource: "existing",
                          })
                        }
                        className="inline-flex min-h-9 items-center rounded-xl bg-[#3b6ef8] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                      >
                        {busy ? copy.saving : copy.addParameter}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.newTitle}
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value.slice(0, 200))}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.newDescription}
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value.slice(0, 4000))}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="block text-xs font-bold text-[#4b5563]">
                {copy.technicalCode}
                <input
                  value={newCode}
                  onChange={(event) => setNewCode(event.target.value.toLowerCase().slice(0, 80))}
                  placeholder="duration"
                  className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.dimension}
                  <select value={newDimension} onChange={(event) => setNewDimension(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {DIMENSIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.valueType}
                  <select value={newValueType} onChange={(event) => setNewValueType(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {VALUE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.unit}
                  <input value={newUnit} onChange={(event) => setNewUnit(event.target.value.toLowerCase().slice(0, 80))} placeholder="minute" className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 font-mono text-sm outline-none" />
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.aggregation}
                  <select value={newAggregation} onChange={(event) => setNewAggregation(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {AGGREGATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#4b5563]">
                  {copy.window}
                  <select value={newWindow} onChange={(event) => setNewWindow(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d8def0] bg-white px-3 text-sm outline-none">
                    <option value="">{copy.choose}</option>
                    {WINDOWS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-[#4b5563]">
                  <input type="checkbox" checked={newAllowNegative} onChange={(event) => setNewAllowNegative(event.target.checked)} />
                  {copy.allowNegative}
                </label>
              </div>

              <button
                type="button"
                disabled={busy || !newParameterValid}
                onClick={() => void createAndAddParameter()}
                className="inline-flex min-h-10 items-center rounded-xl bg-[#3b6ef8] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? copy.saving : copy.createAndAdd}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#d8def0] bg-white p-3">
          <div className="text-sm font-extrabold text-[#263044]">{copy.confirmTitle}</div>
          <div className="mt-1 text-xs leading-5 text-[#727991]">{copy.confirmHint}</div>
          <label className="mt-3 block">
            <div className="mb-1 text-xs font-bold text-[#4b5563]">{copy.confirmComment}</div>
            <textarea
              value={confirmComment}
              onChange={(event) => setConfirmComment(event.target.value.slice(0, 1500))}
              placeholder={copy.confirmCommentHint}
              rows={3}
              className="w-full resize-y rounded-xl border border-[#d8def0] bg-white px-3 py-2 text-sm outline-none"
            />
            <div className="mt-1 text-right text-[10px] text-[#9ca3b8]">{confirmComment.length}/1500</div>
          </label>
          <button
            type="button"
            disabled={busy || !confirmComment.trim()}
            onClick={() =>
              void post({
                action: "confirm_parameter_set",
                comment: confirmComment,
              })
            }
            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? copy.saving : copy.confirmButton}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 text-xs text-red-700">{copy.loadError} {error}</div>
      ) : null}
    </div>
  );
}
