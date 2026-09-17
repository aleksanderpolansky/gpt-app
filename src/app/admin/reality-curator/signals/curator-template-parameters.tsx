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

const EN: Copy = {"title":"Typical activity parameters","hint":"Build the required parameter set for the new system typical activity. Add an existing system parameter or create a missing one. After every addition, the selected set remains visible and you can add another parameter.","rule":"A system typical activity must define at least one measurable parameter. A parameter specifies which value can be recorded for a particular execution of the activity; a fact exists after a value is recorded.","selectedTitle":"Selected parameters","noneSelected":"No parameters have been selected yet.","addAdditional":"+ Add another parameter","chooseExisting":"Choose existing","createNew":"Create new","searchPlaceholder":"Search by name, code or dimensionÃ¢â‚¬Â¦","noAvailable":"No matching active system parameters.","addParameter":"Add parameter","selectedBadge":"Selected","mappingReady":"Observation object for the measurement has been determined","mappingPending":"Observation object for the measurement has not been determined yet","confirmTitle":"Finish the parameter set","confirmHint":"When the set is complete, confirm it. Then process parameters one by one and determine the leaf observation object whose value each parameter measures.","confirmComment":"Decision comment","confirmCommentHint":"Briefly explain why this parameter set is sufficient for the typical activity.","confirmButton":"Confirm parameter set and continue","confirmed":"Typical activity parameter set confirmed","confirmedHint":"The set is fixed for this review step. Now determine, for every selected parameter, the leaf observation object whose value it measures.","currentParameter":"Parameter being configured","allMapped":"Observation objects for measurement determined for all parameters","allMappedHint":"This constructor section is complete. Continue to the next stage of building the system typical activity.","openCatalog":"Open parameter catalog","loading":"Loading parameter constructorÃ¢â‚¬Â¦","saving":"SavingÃ¢â‚¬Â¦","loadError":"Could not load or save the parameter constructor.","newTitle":"Name","newDescription":"Description","technicalCode":"Technical code","dimension":"Dimension","valueType":"Value type","unit":"Canonical unit","aggregation":"Aggregation","window":"Default window","allowNegative":"Allow negative values","choose":"ChooseÃ¢â‚¬Â¦","createAndAdd":"Create system parameter and add it"};

const RU: Copy = {"title":"ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€¹ Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸","hint":"ÃÂ¡Ã‘â€žÃÂ¾Ã‘â‚¬ÃÂ¼ÃÂ¸Ã‘â‚¬Ã‘Æ’ÃÂ¹Ã‘â€šÃÂµ ÃÂ½ÃÂµÃÂ¾ÃÂ±Ã‘â€¦ÃÂ¾ÃÂ´ÃÂ¸ÃÂ¼Ã‘â€¹ÃÂ¹ ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ² ÃÂ½ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¾ÃÂ¹ Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸. Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²Ã‘Å’Ã‘â€šÃÂµ Ã‘ÂÃ‘Æ’Ã‘â€°ÃÂµÃ‘ÂÃ‘â€šÃÂ²Ã‘Æ’Ã‘Å½Ã‘â€°ÃÂ¸ÃÂ¹ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½Ã‘â€¹ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ ÃÂ¸ÃÂ»ÃÂ¸ Ã‘ÂÃÂ¾ÃÂ·ÃÂ´ÃÂ°ÃÂ¹Ã‘â€šÃÂµ ÃÂ½ÃÂµÃÂ´ÃÂ¾Ã‘ÂÃ‘â€šÃÂ°Ã‘Å½Ã‘â€°ÃÂ¸ÃÂ¹. ÃÅ¸ÃÂ¾Ã‘ÂÃÂ»ÃÂµ ÃÂºÃÂ°ÃÂ¶ÃÂ´ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ´ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ»ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ²Ã‘â€¹ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹ÃÂ¹ ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ¾Ã‘ÂÃ‘â€šÃÂ°Ã‘â€˜Ã‘â€šÃ‘ÂÃ‘Â ÃÂ²ÃÂ¸ÃÂ´ÃÂ¸ÃÂ¼Ã‘â€¹ÃÂ¼.","rule":"Ãâ€ÃÂ»Ã‘Â Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¾ÃÂ¹ Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸ ÃÂ´ÃÂ¾ÃÂ»ÃÂ¶ÃÂµÃÂ½ ÃÂ±Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂµÃÂ»Ã‘â€˜ÃÂ½ Ã‘â€¦ÃÂ¾Ã‘â€šÃ‘Â ÃÂ±Ã‘â€¹ ÃÂ¾ÃÂ´ÃÂ¸ÃÂ½ ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬ÃÂ¸ÃÂ¼Ã‘â€¹ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬. ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ ÃÂ·ÃÂ°ÃÂ´ÃÂ°Ã‘â€˜Ã‘â€š, ÃÂºÃÂ°ÃÂºÃÂ¾ÃÂµ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂ¼ÃÂ¾ÃÂ¶ÃÂµÃ‘â€š ÃÂ±Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂ·ÃÂ°Ã‘â€žÃÂ¸ÃÂºÃ‘ÂÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°ÃÂ½ÃÂ¾ ÃÂ¿Ã‘â‚¬ÃÂ¸ ÃÂºÃÂ¾ÃÂ½ÃÂºÃ‘â‚¬ÃÂµÃ‘â€šÃÂ½ÃÂ¾ÃÂ¼ ÃÂ²Ã‘â€¹ÃÂ¿ÃÂ¾ÃÂ»ÃÂ½ÃÂµÃÂ½ÃÂ¸ÃÂ¸ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸; Ã‘â€žÃÂ°ÃÂºÃ‘â€š ÃÂ²ÃÂ¾ÃÂ·ÃÂ½ÃÂ¸ÃÂºÃÂ°ÃÂµÃ‘â€š ÃÂ¿ÃÂ¾Ã‘ÂÃÂ»ÃÂµ ÃÂ·ÃÂ°ÃÂ¿ÃÂ¸Ã‘ÂÃÂ¸ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â.","selectedTitle":"Ãâ€™Ã‘â€¹ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ½Ã‘â€¹ÃÂµ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€¹","noneSelected":"ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€¹ ÃÂµÃ‘â€°Ã‘â€˜ ÃÂ½ÃÂµ ÃÂ²Ã‘â€¹ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½Ã‘â€¹.","addAdditional":"+ Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂµÃ‘â€°Ã‘â€˜ ÃÂ¾ÃÂ´ÃÂ¸ÃÂ½ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬","chooseExisting":"Ãâ€™Ã‘â€¹ÃÂ±Ã‘â‚¬ÃÂ°Ã‘â€šÃ‘Å’ Ã‘ÂÃ‘Æ’Ã‘â€°ÃÂµÃ‘ÂÃ‘â€šÃÂ²Ã‘Æ’Ã‘Å½Ã‘â€°ÃÂ¸ÃÂ¹","createNew":"ÃÂ¡ÃÂ¾ÃÂ·ÃÂ´ÃÂ°Ã‘â€šÃ‘Å’ ÃÂ½ÃÂ¾ÃÂ²Ã‘â€¹ÃÂ¹","searchPlaceholder":"ÃÅ¸ÃÂ¾ÃÂ¸Ã‘ÂÃÂº ÃÂ¿ÃÂ¾ ÃÂ½ÃÂ°ÃÂ·ÃÂ²ÃÂ°ÃÂ½ÃÂ¸Ã‘Å½, ÃÂºÃÂ¾ÃÂ´Ã‘Æ’ ÃÂ¸ÃÂ»ÃÂ¸ ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬ÃÂµÃÂ½ÃÂ¸Ã‘Å½Ã¢â‚¬Â¦","noAvailable":"ÃÅ¸ÃÂ¾ÃÂ´Ã‘â€¦ÃÂ¾ÃÂ´Ã‘ÂÃ‘â€°ÃÂ¸Ã‘â€¦ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½Ã‘â€¹Ã‘â€¦ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½Ã‘â€¹Ã‘â€¦ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ² ÃÂ½ÃÂµ ÃÂ½ÃÂ°ÃÂ¹ÃÂ´ÃÂµÃÂ½ÃÂ¾.","addParameter":"Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬","selectedBadge":"Ãâ€™Ã‘â€¹ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½","mappingReady":"ÃÅ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€š ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂµÃÂ»Ã‘â€˜ÃÂ½","mappingPending":"ÃÅ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€š ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂµÃ‘â€°Ã‘â€˜ ÃÂ½ÃÂµ ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂµÃÂ»Ã‘â€˜ÃÂ½","confirmTitle":"Ãâ€”ÃÂ°ÃÂ²ÃÂµÃ‘â‚¬Ã‘Ë†ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ²","confirmHint":"ÃÅ¡ÃÂ¾ÃÂ³ÃÂ´ÃÂ° ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ Ã‘ÂÃ‘â€žÃÂ¾Ã‘â‚¬ÃÂ¼ÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°ÃÂ½, ÃÂ¿ÃÂ¾ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¸Ã‘â€šÃÂµ ÃÂµÃÂ³ÃÂ¾. Ãâ€”ÃÂ°Ã‘â€šÃÂµÃÂ¼ ÃÂ¾ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ±ÃÂ¾Ã‘â€šÃÂ°ÃÂ¹Ã‘â€šÃÂµ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€¹ ÃÂ¿ÃÂ¾ ÃÂ¾ÃÂ´ÃÂ½ÃÂ¾ÃÂ¼Ã‘Æ’ ÃÂ¸ ÃÂ´ÃÂ»Ã‘Â ÃÂºÃÂ°ÃÂ¶ÃÂ´ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂµÃÂ»ÃÂ¸Ã‘â€šÃÂµ ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€š ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â, ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂºÃÂ¾Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¾ÃÂ½ ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬Ã‘ÂÃÂµÃ‘â€š.","confirmComment":"ÃÅ¡ÃÂ¾ÃÂ¼ÃÂ¼ÃÂµÃÂ½Ã‘â€šÃÂ°Ã‘â‚¬ÃÂ¸ÃÂ¹ ÃÂº Ã‘â‚¬ÃÂµÃ‘Ë†ÃÂµÃÂ½ÃÂ¸Ã‘Å½","confirmCommentHint":"ÃÅ¡Ã‘â‚¬ÃÂ°Ã‘â€šÃÂºÃÂ¾ ÃÂ¾ÃÂ±Ã‘Å Ã‘ÂÃ‘ÂÃÂ½ÃÂ¸Ã‘â€šÃÂµ, ÃÂ¿ÃÂ¾Ã‘â€¡ÃÂµÃÂ¼Ã‘Æ’ Ã‘ÂÃ‘â€šÃÂ¾ÃÂ³ÃÂ¾ ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ÃÂ° ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ² ÃÂ´ÃÂ¾Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃÂ¾Ã‘â€¡ÃÂ½ÃÂ¾ ÃÂ´ÃÂ»Ã‘Â Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸.","confirmButton":"ÃÅ¸ÃÂ¾ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ² ÃÂ¸ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ´ÃÂ¾ÃÂ»ÃÂ¶ÃÂ¸Ã‘â€šÃ‘Å’","confirmed":"ÃÂÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ² Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸ ÃÂ¿ÃÂ¾ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ¶ÃÂ´Ã‘â€˜ÃÂ½","confirmedHint":"ÃÂÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ·ÃÂ°Ã‘â€žÃÂ¸ÃÂºÃ‘ÂÃÂ¸Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂ°ÃÂ½ ÃÂ´ÃÂ»Ã‘Â Ã‘ÂÃ‘â€šÃÂ¾ÃÂ³ÃÂ¾ Ã‘Ë†ÃÂ°ÃÂ³ÃÂ° ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ²ÃÂµÃ‘â‚¬ÃÂºÃÂ¸. ÃÂ¢ÃÂµÃÂ¿ÃÂµÃ‘â‚¬Ã‘Å’ ÃÂ´ÃÂ»Ã‘Â ÃÂºÃÂ°ÃÂ¶ÃÂ´ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ° ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂµÃÂ»ÃÂ¸Ã‘â€šÃÂµ ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€š ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â, ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¸ÃÂµ ÃÂºÃÂ¾Ã‘â€šÃÂ¾Ã‘â‚¬ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¾ÃÂ½ ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬Ã‘ÂÃÂµÃ‘â€š.","currentParameter":"ÃÂÃÂ°Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ°ÃÂ¸ÃÂ²ÃÂ°ÃÂµÃÂ¼Ã‘â€¹ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬","allMapped":"ÃÅ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€šÃ‘â€¹ ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂ¸ÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂµÃÂ´ÃÂµÃÂ»ÃÂµÃÂ½Ã‘â€¹ ÃÂ´ÃÂ»Ã‘Â ÃÂ²Ã‘ÂÃÂµÃ‘â€¦ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ²","allMappedHint":"ÃÂ­Ã‘â€šÃÂ¾Ã‘â€š Ã‘Æ’Ã‘â€¡ÃÂ°Ã‘ÂÃ‘â€šÃÂ¾ÃÂº ÃÂºÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ° ÃÂ·ÃÂ°ÃÂ²ÃÂµÃ‘â‚¬Ã‘Ë†Ã‘â€˜ÃÂ½. ÃÅ“ÃÂ¾ÃÂ¶ÃÂ½ÃÂ¾ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃ‘â€¦ÃÂ¾ÃÂ´ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂº Ã‘ÂÃÂ»ÃÂµÃÂ´Ã‘Æ’Ã‘Å½Ã‘â€°ÃÂµÃÂ¼Ã‘Æ’ Ã‘ÂÃ‘â€šÃÂ°ÃÂ¿Ã‘Æ’ ÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂµÃÂ½ÃÂ¸Ã‘Â Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¾ÃÂ¹ Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾ÃÂ¹ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃÂ¸.","openCatalog":"ÃÅ¾Ã‘â€šÃÂºÃ‘â‚¬Ã‘â€¹Ã‘â€šÃ‘Å’ ÃÂºÃÂ°Ã‘â€šÃÂ°ÃÂ»ÃÂ¾ÃÂ³ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ²","loading":"Ãâ€”ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ¶ÃÂ°ÃÂµÃÂ¼ ÃÂºÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€šÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ²Ã¢â‚¬Â¦","saving":"ÃÂ¡ÃÂ¾Ã‘â€¦Ã‘â‚¬ÃÂ°ÃÂ½Ã‘ÂÃÂµÃÂ¼Ã¢â‚¬Â¦","loadError":"ÃÂÃÂµ Ã‘Æ’ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Å’ ÃÂ·ÃÂ°ÃÂ³Ã‘â‚¬Ã‘Æ’ÃÂ·ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¸ÃÂ»ÃÂ¸ Ã‘ÂÃÂ¾Ã‘â€¦Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂºÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€šÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¾ÃÂ².","newTitle":"ÃÂÃÂ°ÃÂ·ÃÂ²ÃÂ°ÃÂ½ÃÂ¸ÃÂµ","newDescription":"ÃÅ¾ÃÂ¿ÃÂ¸Ã‘ÂÃÂ°ÃÂ½ÃÂ¸ÃÂµ","technicalCode":"ÃÂ¢ÃÂµÃ‘â€¦ÃÂ½ÃÂ¸Ã‘â€¡ÃÂµÃ‘ÂÃÂºÃÂ¸ÃÂ¹ ÃÂºÃÂ¾ÃÂ´","dimension":"ÃËœÃÂ·ÃÂ¼ÃÂµÃ‘â‚¬ÃÂµÃÂ½ÃÂ¸ÃÂµ","valueType":"ÃÂ¢ÃÂ¸ÃÂ¿ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â","unit":"ÃÅ¡ÃÂ°ÃÂ½ÃÂ¾ÃÂ½ÃÂ¸Ã‘â€¡ÃÂµÃ‘ÂÃÂºÃÂ°Ã‘Â ÃÂµÃÂ´ÃÂ¸ÃÂ½ÃÂ¸Ã‘â€ ÃÂ°","aggregation":"ÃÂÃÂ³Ã‘â‚¬ÃÂµÃÂ³ÃÂ°Ã‘â€ ÃÂ¸Ã‘Â","window":"ÃÅ¾ÃÂºÃÂ½ÃÂ¾ ÃÂ¿ÃÂ¾ Ã‘Æ’ÃÂ¼ÃÂ¾ÃÂ»Ã‘â€¡ÃÂ°ÃÂ½ÃÂ¸Ã‘Å½","allowNegative":"ÃÂ ÃÂ°ÃÂ·Ã‘â‚¬ÃÂµÃ‘Ë†ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂ¾Ã‘â€šÃ‘â‚¬ÃÂ¸Ã‘â€ ÃÂ°Ã‘â€šÃÂµÃÂ»Ã‘Å’ÃÂ½Ã‘â€¹ÃÂµ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¸Ã‘Â","choose":"Ãâ€™Ã‘â€¹ÃÂ±ÃÂµÃ‘â‚¬ÃÂ¸Ã‘â€šÃÂµÃ¢â‚¬Â¦","createAndAdd":"ÃÂ¡ÃÂ¾ÃÂ·ÃÂ´ÃÂ°Ã‘â€šÃ‘Å’ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½Ã‘â€¹ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ ÃÂ¸ ÃÂ´ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’"};

const PL: Copy = {"title":"Parametry aktywnoÃ…â€ºci typowej","hint":"Zbuduj wymagany zestaw parametrÃƒÂ³w nowej systemowej aktywnoÃ…â€ºci typowej. Dodaj istniejÃ„â€¦cy parametr systemowy albo utwÃƒÂ³rz brakujÃ„â€¦cy. Po kaÃ…Â¼dym dodaniu wybrany zestaw pozostaje widoczny.","rule":"Dla systemowej aktywnoÃ…â€ºci typowej trzeba okreÃ…â€ºliÃ„â€¡ co najmniej jeden mierzalny parametr. Parametr okreÃ…â€ºla, jaka wartoÃ…â€ºÃ„â€¡ moÃ…Â¼e zostaÃ„â€¡ zapisana dla konkretnego wykonania aktywnoÃ…â€ºci; fakt powstaje po zapisaniu wartoÃ…â€ºci.","selectedTitle":"Wybrane parametry","noneSelected":"Nie wybrano jeszcze parametrÃƒÂ³w.","addAdditional":"+ Dodaj kolejny parametr","chooseExisting":"Wybierz istniejÃ„â€¦cy","createNew":"UtwÃƒÂ³rz nowy","searchPlaceholder":"Szukaj po nazwie, kodzie lub wymiarzeÃ¢â‚¬Â¦","noAvailable":"Nie znaleziono pasujÃ„â€¦cych aktywnych parametrÃƒÂ³w systemowych.","addParameter":"Dodaj parametr","selectedBadge":"Wybrano","mappingReady":"OkreÃ…â€ºlono obiekt obserwacji dla pomiaru","mappingPending":"Nie okreÃ…â€ºlono jeszcze obiektu obserwacji dla pomiaru","confirmTitle":"ZakoÃ…â€žcz zestaw parametrÃƒÂ³w","confirmHint":"Gdy zestaw jest gotowy, potwierdÃ…Âº go. NastÃ„â„¢pnie obsÃ…â€šuÃ…Â¼ parametry po kolei i dla kaÃ…Â¼dego okreÃ…â€ºl liÃ…â€ºciowy obiekt obserwacji, ktÃƒÂ³rego wartoÃ…â€ºÃ„â€¡ mierzy.","confirmComment":"Komentarz do decyzji","confirmCommentHint":"KrÃƒÂ³tko wyjaÃ…â€ºnij, dlaczego ten zestaw parametrÃƒÂ³w jest wystarczajÃ„â€¦cy.","confirmButton":"PotwierdÃ…Âº zestaw i kontynuuj","confirmed":"Zestaw parametrÃƒÂ³w aktywnoÃ…â€ºci typowej potwierdzony","confirmedHint":"Zestaw zostaÃ…â€š ustalony dla tego kroku. Teraz dla kaÃ…Â¼dego parametru okreÃ…â€ºl liÃ…â€ºciowy obiekt obserwacji, ktÃƒÂ³rego wartoÃ…â€ºÃ„â€¡ mierzy.","currentParameter":"Konfigurowany parametr","allMapped":"OkreÃ…â€ºlono obiekty obserwacji dla wszystkich pomiarÃƒÂ³w","allMappedHint":"Ta czÃ„â„¢Ã…â€ºÃ„â€¡ konstruktora jest zakoÃ…â€žczona. MoÃ…Â¼na przejÃ…â€ºÃ„â€¡ do kolejnego etapu.","openCatalog":"OtwÃƒÂ³rz katalog parametrÃƒÂ³w","loading":"Wczytywanie konstruktora parametrÃƒÂ³wÃ¢â‚¬Â¦","saving":"ZapisywanieÃ¢â‚¬Â¦","loadError":"Nie udaÃ…â€šo siÃ„â„¢ wczytaÃ„â€¡ lub zapisaÃ„â€¡ konstruktora parametrÃƒÂ³w.","newTitle":"Nazwa","newDescription":"Opis","technicalCode":"Kod techniczny","dimension":"Wymiar","valueType":"Typ wartoÃ…â€ºci","unit":"Jednostka kanoniczna","aggregation":"Agregacja","window":"DomyÃ…â€ºlne okno","allowNegative":"DopuÃ…â€ºÃ„â€¡ wartoÃ…â€ºci ujemne","choose":"WybierzÃ¢â‚¬Â¦","createAndAdd":"UtwÃƒÂ³rz parametr systemowy i dodaj"};

const UK: Copy = {"title":"ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¸ Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“","hint":"ÃÂ¡Ã‘â€žÃÂ¾Ã‘â‚¬ÃÂ¼Ã‘Æ’ÃÂ¹Ã‘â€šÃÂµ ÃÂ½ÃÂµÃÂ¾ÃÂ±Ã‘â€¦Ã‘â€“ÃÂ´ÃÂ½ÃÂ¸ÃÂ¹ ÃÂ½ÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ² ÃÂ½ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¾Ã‘â€” Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“. Ãâ€ÃÂ¾ÃÂ´ÃÂ°ÃÂ¹Ã‘â€šÃÂµ ÃÂ½ÃÂ°Ã‘ÂÃÂ²ÃÂ½ÃÂ¸ÃÂ¹ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¸ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ ÃÂ°ÃÂ±ÃÂ¾ Ã‘ÂÃ‘â€šÃÂ²ÃÂ¾Ã‘â‚¬Ã‘â€“Ã‘â€šÃ‘Å’ ÃÂ²Ã‘â€“ÃÂ´Ã‘ÂÃ‘Æ’Ã‘â€šÃÂ½Ã‘â€“ÃÂ¹. ÃÅ¸Ã‘â€“Ã‘ÂÃÂ»Ã‘Â ÃÂºÃÂ¾ÃÂ¶ÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ´ÃÂ¾ÃÂ´ÃÂ°ÃÂ²ÃÂ°ÃÂ½ÃÂ½Ã‘Â ÃÂ²ÃÂ¸ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ¸ÃÂ¹ ÃÂ½ÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ·ÃÂ°ÃÂ»ÃÂ¸Ã‘Ë†ÃÂ°Ã‘â€Ã‘â€šÃ‘Å’Ã‘ÂÃ‘Â ÃÂ²ÃÂ¸ÃÂ´ÃÂ¸ÃÂ¼ÃÂ¸ÃÂ¼.","rule":"Ãâ€ÃÂ»Ã‘Â Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¾Ã‘â€” Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“ ÃÂ¼ÃÂ°Ã‘â€ ÃÂ±Ã‘Æ’Ã‘â€šÃÂ¸ ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾ Ã‘â€°ÃÂ¾ÃÂ½ÃÂ°ÃÂ¹ÃÂ¼ÃÂµÃÂ½Ã‘Ë†ÃÂµ ÃÂ¾ÃÂ´ÃÂ¸ÃÂ½ ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬Ã‘Å½ÃÂ²ÃÂ°ÃÂ½ÃÂ¸ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬. ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂ°Ã‘â€, Ã‘ÂÃÂºÃÂµ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘Â ÃÂ¼ÃÂ¾ÃÂ¶ÃÂ½ÃÂ° ÃÂ·ÃÂ°Ã‘â€žÃ‘â€“ÃÂºÃ‘ÂÃ‘Æ’ÃÂ²ÃÂ°Ã‘â€šÃÂ¸ ÃÂ¿Ã‘â€“ÃÂ´ Ã‘â€¡ÃÂ°Ã‘Â ÃÂºÃÂ¾ÃÂ½ÃÂºÃ‘â‚¬ÃÂµÃ‘â€šÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ²ÃÂ¸ÃÂºÃÂ¾ÃÂ½ÃÂ°ÃÂ½ÃÂ½Ã‘Â ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“; Ã‘â€žÃÂ°ÃÂºÃ‘â€š ÃÂ²ÃÂ¸ÃÂ½ÃÂ¸ÃÂºÃÂ°Ã‘â€ ÃÂ¿Ã‘â€“Ã‘ÂÃÂ»Ã‘Â ÃÂ·ÃÂ°ÃÂ¿ÃÂ¸Ã‘ÂÃ‘Æ’ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘Â.","selectedTitle":"Ãâ€™ÃÂ¸ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½Ã‘â€“ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¸","noneSelected":"ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¸ Ã‘â€°ÃÂµ ÃÂ½ÃÂµ ÃÂ²ÃÂ¸ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ¾.","addAdditional":"+ Ãâ€ÃÂ¾ÃÂ´ÃÂ°Ã‘â€šÃÂ¸ Ã‘â€°ÃÂµ ÃÂ¾ÃÂ´ÃÂ¸ÃÂ½ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬","chooseExisting":"Ãâ€™ÃÂ¸ÃÂ±Ã‘â‚¬ÃÂ°Ã‘â€šÃÂ¸ ÃÂ½ÃÂ°Ã‘ÂÃÂ²ÃÂ½ÃÂ¸ÃÂ¹","createNew":"ÃÂ¡Ã‘â€šÃÂ²ÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘â€šÃÂ¸ ÃÂ½ÃÂ¾ÃÂ²ÃÂ¸ÃÂ¹","searchPlaceholder":"ÃÅ¸ÃÂ¾Ã‘Ë†Ã‘Æ’ÃÂº ÃÂ·ÃÂ° ÃÂ½ÃÂ°ÃÂ·ÃÂ²ÃÂ¾Ã‘Å½, ÃÂºÃÂ¾ÃÂ´ÃÂ¾ÃÂ¼ ÃÂ°ÃÂ±ÃÂ¾ ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬ÃÂ¾ÃÂ¼Ã¢â‚¬Â¦","noAvailable":"Ãâ€™Ã‘â€“ÃÂ´ÃÂ¿ÃÂ¾ÃÂ²Ã‘â€“ÃÂ´ÃÂ½ÃÂ¸Ã‘â€¦ ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¸Ã‘â€¦ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¸Ã‘â€¦ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ² ÃÂ½ÃÂµ ÃÂ·ÃÂ½ÃÂ°ÃÂ¹ÃÂ´ÃÂµÃÂ½ÃÂ¾.","addParameter":"Ãâ€ÃÂ¾ÃÂ´ÃÂ°Ã‘â€šÃÂ¸ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬","selectedBadge":"Ãâ€™ÃÂ¸ÃÂ±Ã‘â‚¬ÃÂ°ÃÂ½ÃÂ¾","mappingReady":"ÃÅ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€š Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬Ã‘Å½ÃÂ²ÃÂ°ÃÂ½ÃÂ½Ã‘Â ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾","mappingPending":"ÃÅ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€š Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬Ã‘Å½ÃÂ²ÃÂ°ÃÂ½ÃÂ½Ã‘Â Ã‘â€°ÃÂµ ÃÂ½ÃÂµ ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾","confirmTitle":"Ãâ€”ÃÂ°ÃÂ²ÃÂµÃ‘â‚¬Ã‘Ë†ÃÂ¸Ã‘â€šÃÂ¸ ÃÂ½ÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ²","confirmHint":"ÃÅ¡ÃÂ¾ÃÂ»ÃÂ¸ ÃÂ½ÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ Ã‘ÂÃ‘â€žÃÂ¾Ã‘â‚¬ÃÂ¼ÃÂ¾ÃÂ²ÃÂ°ÃÂ½ÃÂ¾, ÃÂ¿Ã‘â€“ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´Ã‘Å’Ã‘â€šÃÂµ ÃÂ¹ÃÂ¾ÃÂ³ÃÂ¾. ÃÅ¸ÃÂ¾Ã‘â€šÃ‘â€“ÃÂ¼ ÃÂ¾ÃÂ¿Ã‘â‚¬ÃÂ°Ã‘â€ Ã‘Å’ÃÂ¾ÃÂ²Ã‘Æ’ÃÂ¹Ã‘â€šÃÂµ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ¸ ÃÂ¿ÃÂ¾ ÃÂ¾ÃÂ´ÃÂ½ÃÂ¾ÃÂ¼Ã‘Æ’ ÃÂ¹ ÃÂ´ÃÂ»Ã‘Â ÃÂºÃÂ¾ÃÂ¶ÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡Ã‘â€šÃÂµ ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂ²ÃÂ¸ÃÂ¹ ÃÂ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€š Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â, ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘Â Ã‘ÂÃÂºÃÂ¾ÃÂ³ÃÂ¾ ÃÂ²Ã‘â€“ÃÂ½ ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬Ã‘Å½Ã‘â€.","confirmComment":"ÃÅ¡ÃÂ¾ÃÂ¼ÃÂµÃÂ½Ã‘â€šÃÂ°Ã‘â‚¬ ÃÂ´ÃÂ¾ Ã‘â‚¬Ã‘â€“Ã‘Ë†ÃÂµÃÂ½ÃÂ½Ã‘Â","confirmCommentHint":"ÃÅ¡ÃÂ¾Ã‘â‚¬ÃÂ¾Ã‘â€šÃÂºÃÂ¾ ÃÂ¿ÃÂ¾Ã‘ÂÃ‘ÂÃÂ½Ã‘â€“Ã‘â€šÃ‘Å’, Ã‘â€¡ÃÂ¾ÃÂ¼Ã‘Æ’ Ã‘â€ Ã‘Å’ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ½ÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬Ã‘Æ’ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ² ÃÂ´ÃÂ¾Ã‘ÂÃ‘â€šÃÂ°Ã‘â€šÃÂ½Ã‘Å’ÃÂ¾ ÃÂ´ÃÂ»Ã‘Â Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“.","confirmButton":"ÃÅ¸Ã‘â€“ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¸Ã‘â€šÃÂ¸ ÃÂ½ÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ² Ã‘â€“ ÃÂ¿Ã‘â‚¬ÃÂ¾ÃÂ´ÃÂ¾ÃÂ²ÃÂ¶ÃÂ¸Ã‘â€šÃÂ¸","confirmed":"ÃÂÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ² Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“ ÃÂ¿Ã‘â€“ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¶ÃÂµÃÂ½ÃÂ¾","confirmedHint":"ÃÂÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ·ÃÂ°Ã‘â€žÃ‘â€“ÃÂºÃ‘ÂÃÂ¾ÃÂ²ÃÂ°ÃÂ½ÃÂ¾ ÃÂ´ÃÂ»Ã‘Â Ã‘â€ Ã‘Å’ÃÂ¾ÃÂ³ÃÂ¾ ÃÂµÃ‘â€šÃÂ°ÃÂ¿Ã‘Æ’ ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃÂ²Ã‘â€“Ã‘â‚¬ÃÂºÃÂ¸. ÃÂ¢ÃÂµÃÂ¿ÃÂµÃ‘â‚¬ ÃÂ´ÃÂ»Ã‘Â ÃÂºÃÂ¾ÃÂ¶ÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ° ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡Ã‘â€šÃÂµ ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂ²ÃÂ¸ÃÂ¹ ÃÂ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€š Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â, ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘Â Ã‘ÂÃÂºÃÂ¾ÃÂ³ÃÂ¾ ÃÂ²Ã‘â€“ÃÂ½ ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬Ã‘Å½Ã‘â€.","currentParameter":"ÃÅ¸ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬, Ã‘â€°ÃÂ¾ ÃÂ½ÃÂ°ÃÂ»ÃÂ°Ã‘Ë†Ã‘â€šÃÂ¾ÃÂ²Ã‘Æ’Ã‘â€Ã‘â€šÃ‘Å’Ã‘ÂÃ‘Â","allMapped":"ÃÅ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€šÃÂ¸ Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â ÃÂ´ÃÂ»Ã‘Â ÃÂ²ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬Ã‘Å½ÃÂ²ÃÂ°ÃÂ½ÃÂ½Ã‘Â ÃÂ²ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾ ÃÂ´ÃÂ»Ã‘Â ÃÂ²Ã‘ÂÃ‘â€“Ã‘â€¦ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ²","allMappedHint":"ÃÂ¦Ã‘Å½ Ã‘â€¡ÃÂ°Ã‘ÂÃ‘â€šÃÂ¸ÃÂ½Ã‘Æ’ ÃÂºÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€šÃÂ¾Ã‘â‚¬ÃÂ° ÃÂ·ÃÂ°ÃÂ²ÃÂµÃ‘â‚¬Ã‘Ë†ÃÂµÃÂ½ÃÂ¾. ÃÅ“ÃÂ¾ÃÂ¶ÃÂ½ÃÂ° ÃÂ¿ÃÂµÃ‘â‚¬ÃÂµÃ‘â€¦ÃÂ¾ÃÂ´ÃÂ¸Ã‘â€šÃÂ¸ ÃÂ´ÃÂ¾ ÃÂ½ÃÂ°Ã‘ÂÃ‘â€šÃ‘Æ’ÃÂ¿ÃÂ½ÃÂ¾ÃÂ³ÃÂ¾ ÃÂµÃ‘â€šÃÂ°ÃÂ¿Ã‘Æ’ Ã‘ÂÃ‘â€šÃÂ²ÃÂ¾Ã‘â‚¬ÃÂµÃÂ½ÃÂ½Ã‘Â Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¾Ã‘â€” Ã‘â€šÃÂ¸ÃÂ¿ÃÂ¾ÃÂ²ÃÂ¾Ã‘â€” ÃÂ°ÃÂºÃ‘â€šÃÂ¸ÃÂ²ÃÂ½ÃÂ¾Ã‘ÂÃ‘â€šÃ‘â€“.","openCatalog":"Ãâ€™Ã‘â€“ÃÂ´ÃÂºÃ‘â‚¬ÃÂ¸Ã‘â€šÃÂ¸ ÃÂºÃÂ°Ã‘â€šÃÂ°ÃÂ»ÃÂ¾ÃÂ³ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ²","loading":"Ãâ€”ÃÂ°ÃÂ²ÃÂ°ÃÂ½Ã‘â€šÃÂ°ÃÂ¶Ã‘Æ’Ã‘â€ÃÂ¼ÃÂ¾ ÃÂºÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€šÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ²Ã¢â‚¬Â¦","saving":"Ãâ€”ÃÂ±ÃÂµÃ‘â‚¬Ã‘â€“ÃÂ³ÃÂ°Ã‘â€ÃÂ¼ÃÂ¾Ã¢â‚¬Â¦","loadError":"ÃÂÃÂµ ÃÂ²ÃÂ´ÃÂ°ÃÂ»ÃÂ¾Ã‘ÂÃ‘Â ÃÂ·ÃÂ°ÃÂ²ÃÂ°ÃÂ½Ã‘â€šÃÂ°ÃÂ¶ÃÂ¸Ã‘â€šÃÂ¸ ÃÂ°ÃÂ±ÃÂ¾ ÃÂ·ÃÂ±ÃÂµÃ‘â‚¬ÃÂµÃÂ³Ã‘â€šÃÂ¸ ÃÂºÃÂ¾ÃÂ½Ã‘ÂÃ‘â€šÃ‘â‚¬Ã‘Æ’ÃÂºÃ‘â€šÃÂ¾Ã‘â‚¬ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬Ã‘â€“ÃÂ².","newTitle":"ÃÂÃÂ°ÃÂ·ÃÂ²ÃÂ°","newDescription":"ÃÅ¾ÃÂ¿ÃÂ¸Ã‘Â","technicalCode":"ÃÂ¢ÃÂµÃ‘â€¦ÃÂ½Ã‘â€“Ã‘â€¡ÃÂ½ÃÂ¸ÃÂ¹ ÃÂºÃÂ¾ÃÂ´","dimension":"Ãâ€™ÃÂ¸ÃÂ¼Ã‘â€“Ã‘â‚¬","valueType":"ÃÂ¢ÃÂ¸ÃÂ¿ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘Â","unit":"ÃÅ¡ÃÂ°ÃÂ½ÃÂ¾ÃÂ½Ã‘â€“Ã‘â€¡ÃÂ½ÃÂ° ÃÂ¾ÃÂ´ÃÂ¸ÃÂ½ÃÂ¸Ã‘â€ Ã‘Â","aggregation":"ÃÂÃÂ³Ã‘â‚¬ÃÂµÃÂ³ÃÂ°Ã‘â€ Ã‘â€“Ã‘Â","window":"Ãâ€™Ã‘â€“ÃÂºÃÂ½ÃÂ¾ ÃÂ·ÃÂ° ÃÂ·ÃÂ°ÃÂ¼ÃÂ¾ÃÂ²Ã‘â€¡Ã‘Æ’ÃÂ²ÃÂ°ÃÂ½ÃÂ½Ã‘ÂÃÂ¼","allowNegative":"Ãâ€ÃÂ¾ÃÂ·ÃÂ²ÃÂ¾ÃÂ»ÃÂ¸Ã‘â€šÃÂ¸ ÃÂ²Ã‘â€“ÃÂ´Ã¢â‚¬â„¢Ã‘â€ÃÂ¼ÃÂ½Ã‘â€“ ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ½Ã‘Â","choose":"Ãâ€™ÃÂ¸ÃÂ±ÃÂµÃ‘â‚¬Ã‘â€“Ã‘â€šÃ‘Å’Ã¢â‚¬Â¦","createAndAdd":"ÃÂ¡Ã‘â€šÃÂ²ÃÂ¾Ã‘â‚¬ÃÂ¸Ã‘â€šÃÂ¸ Ã‘ÂÃÂ¸Ã‘ÂÃ‘â€šÃÂµÃÂ¼ÃÂ½ÃÂ¸ÃÂ¹ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ Ã‘â€“ ÃÂ´ÃÂ¾ÃÂ´ÃÂ°Ã‘â€šÃÂ¸"};

const DE: Copy = {"title":"Parameter der typischen AktivitÃƒÂ¤t","hint":"Stellen Sie den erforderlichen Parametersatz fÃƒÂ¼r die neue systemweite typische AktivitÃƒÂ¤t zusammen. FÃƒÂ¼gen Sie einen vorhandenen Systemparameter hinzu oder erstellen Sie einen fehlenden. Der gewÃƒÂ¤hlte Satz bleibt sichtbar.","rule":"FÃƒÂ¼r eine systemweite typische AktivitÃƒÂ¤t muss mindestens ein messbarer Parameter festgelegt sein. Ein Parameter bestimmt, welcher Wert bei einer konkreten AusfÃƒÂ¼hrung erfasst werden kann; ein Fakt entsteht nach dem Speichern eines Werts.","selectedTitle":"AusgewÃƒÂ¤hlte Parameter","noneSelected":"Noch keine Parameter ausgewÃƒÂ¤hlt.","addAdditional":"+ Weiteren Parameter hinzufÃƒÂ¼gen","chooseExisting":"Vorhandenen auswÃƒÂ¤hlen","createNew":"Neu erstellen","searchPlaceholder":"Nach Name, Code oder Dimension suchenÃ¢â‚¬Â¦","noAvailable":"Keine passenden aktiven Systemparameter gefunden.","addParameter":"Parameter hinzufÃƒÂ¼gen","selectedBadge":"AusgewÃƒÂ¤hlt","mappingReady":"Beobachtungsobjekt fÃƒÂ¼r die Messung bestimmt","mappingPending":"Beobachtungsobjekt fÃƒÂ¼r die Messung noch nicht bestimmt","confirmTitle":"Parametersatz abschlieÃƒÅ¸en","confirmHint":"BestÃƒÂ¤tigen Sie den vollstÃƒÂ¤ndigen Satz. Bearbeiten Sie danach die Parameter einzeln und bestimmen Sie jeweils das Blatt-Beobachtungsobjekt, dessen Wert gemessen wird.","confirmComment":"Entscheidungskommentar","confirmCommentHint":"BegrÃƒÂ¼nden Sie kurz, warum dieser Parametersatz ausreicht.","confirmButton":"Parametersatz bestÃƒÂ¤tigen und fortfahren","confirmed":"Parametersatz der typischen AktivitÃƒÂ¤t bestÃƒÂ¤tigt","confirmedHint":"Der Satz ist fÃƒÂ¼r diesen PrÃƒÂ¼fschritt festgelegt. Bestimmen Sie nun fÃƒÂ¼r jeden Parameter das Blatt-Beobachtungsobjekt, dessen Wert er misst.","currentParameter":"Konfigurierter Parameter","allMapped":"Beobachtungsobjekte fÃƒÂ¼r alle Messungen bestimmt","allMappedHint":"Dieser Abschnitt ist abgeschlossen. Sie kÃƒÂ¶nnen mit der nÃƒÂ¤chsten Phase fortfahren.","openCatalog":"Parameterkatalog ÃƒÂ¶ffnen","loading":"Parameterkonstruktor wird geladenÃ¢â‚¬Â¦","saving":"SpeichernÃ¢â‚¬Â¦","loadError":"Parameterkonstruktor konnte nicht geladen oder gespeichert werden.","newTitle":"Name","newDescription":"Beschreibung","technicalCode":"Technischer Code","dimension":"Dimension","valueType":"Werttyp","unit":"Kanonische Einheit","aggregation":"Aggregation","window":"Standardfenster","allowNegative":"Negative Werte erlauben","choose":"AuswÃƒÂ¤hlenÃ¢â‚¬Â¦","createAndAdd":"Systemparameter erstellen und hinzufÃƒÂ¼gen"};

const ES: Copy = {"title":"ParÃƒÂ¡metros de la actividad tÃƒÂ­pica","hint":"Defina el conjunto de parÃƒÂ¡metros necesario para la nueva actividad tÃƒÂ­pica del sistema. AÃƒÂ±ada un parÃƒÂ¡metro existente o cree uno que falte. El conjunto seleccionado permanece visible.","rule":"Una actividad tÃƒÂ­pica del sistema debe tener al menos un parÃƒÂ¡metro medible definido. El parÃƒÂ¡metro determina quÃƒÂ© valor puede registrarse para una ejecuciÃƒÂ³n concreta; el hecho existe despuÃƒÂ©s de registrar un valor.","selectedTitle":"ParÃƒÂ¡metros seleccionados","noneSelected":"TodavÃƒÂ­a no se ha seleccionado ningÃƒÂºn parÃƒÂ¡metro.","addAdditional":"+ AÃƒÂ±adir otro parÃƒÂ¡metro","chooseExisting":"Elegir existente","createNew":"Crear nuevo","searchPlaceholder":"Buscar por nombre, cÃƒÂ³digo o dimensiÃƒÂ³nÃ¢â‚¬Â¦","noAvailable":"No se encontraron parÃƒÂ¡metros activos que coincidan.","addParameter":"AÃƒÂ±adir parÃƒÂ¡metro","selectedBadge":"Seleccionado","mappingReady":"Objeto de observaciÃƒÂ³n para la mediciÃƒÂ³n determinado","mappingPending":"El objeto de observaciÃƒÂ³n para la mediciÃƒÂ³n aÃƒÂºn no estÃƒÂ¡ determinado","confirmTitle":"Finalizar el conjunto de parÃƒÂ¡metros","confirmHint":"Confirme el conjunto cuando estÃƒÂ© completo. DespuÃƒÂ©s procese los parÃƒÂ¡metros uno a uno y determine para cada uno el objeto de observaciÃƒÂ³n hoja cuyo valor mide.","confirmComment":"Comentario de la decisiÃƒÂ³n","confirmCommentHint":"Explique brevemente por quÃƒÂ© este conjunto es suficiente.","confirmButton":"Confirmar el conjunto y continuar","confirmed":"Conjunto de parÃƒÂ¡metros confirmado","confirmedHint":"El conjunto queda fijado para este paso. Ahora determine para cada parÃƒÂ¡metro el objeto de observaciÃƒÂ³n hoja cuyo valor mide.","currentParameter":"ParÃƒÂ¡metro en configuraciÃƒÂ³n","allMapped":"Objetos de observaciÃƒÂ³n determinados para todas las mediciones","allMappedHint":"Esta parte del constructor estÃƒÂ¡ completa. Puede continuar con la siguiente etapa.","openCatalog":"Abrir catÃƒÂ¡logo de parÃƒÂ¡metros","loading":"Cargando constructor de parÃƒÂ¡metrosÃ¢â‚¬Â¦","saving":"GuardandoÃ¢â‚¬Â¦","loadError":"No se pudo cargar o guardar el constructor de parÃƒÂ¡metros.","newTitle":"Nombre","newDescription":"DescripciÃƒÂ³n","technicalCode":"CÃƒÂ³digo tÃƒÂ©cnico","dimension":"DimensiÃƒÂ³n","valueType":"Tipo de valor","unit":"Unidad canÃƒÂ³nica","aggregation":"AgregaciÃƒÂ³n","window":"Ventana predeterminada","allowNegative":"Permitir valores negativos","choose":"ElegirÃ¢â‚¬Â¦","createAndAdd":"Crear parÃƒÂ¡metro del sistema y aÃƒÂ±adirlo"};

const CS: Copy = {"title":"Parametry typickÃƒÂ© aktivity","hint":"Sestavte poÃ…Â¾adovanou sadu parametrÃ…Â¯ pro novou systÃƒÂ©movou typickou aktivitu. PÃ…â„¢idejte existujÃƒÂ­cÃƒÂ­ systÃƒÂ©movÃƒÂ½ parametr nebo vytvoÃ…â„¢te chybÃ„â€ºjÃƒÂ­cÃƒÂ­. VybranÃƒÂ¡ sada zÃ…Â¯stÃƒÂ¡vÃƒÂ¡ viditelnÃƒÂ¡.","rule":"Pro systÃƒÂ©movou typickou aktivitu musÃƒÂ­ bÃƒÂ½t urÃ„Âen alespoÃ…Ë† jeden mÃ„â€ºÃ…â„¢itelnÃƒÂ½ parametr. Parametr urÃ„Âuje, jakou hodnotu lze zaznamenat pro konkrÃƒÂ©tnÃƒÂ­ provedenÃƒÂ­; fakt vznikÃƒÂ¡ po uloÃ…Â¾enÃƒÂ­ hodnoty.","selectedTitle":"VybranÃƒÂ© parametry","noneSelected":"ZatÃƒÂ­m nebyl vybrÃƒÂ¡n Ã…Â¾ÃƒÂ¡dnÃƒÂ½ parametr.","addAdditional":"+ PÃ…â„¢idat dalÃ…Â¡ÃƒÂ­ parametr","chooseExisting":"Vybrat existujÃƒÂ­cÃƒÂ­","createNew":"VytvoÃ…â„¢it novÃƒÂ½","searchPlaceholder":"Hledat podle nÃƒÂ¡zvu, kÃƒÂ³du nebo rozmÃ„â€ºruÃ¢â‚¬Â¦","noAvailable":"Nebyly nalezeny odpovÃƒÂ­dajÃƒÂ­cÃƒÂ­ aktivnÃƒÂ­ systÃƒÂ©movÃƒÂ© parametry.","addParameter":"PÃ…â„¢idat parametr","selectedBadge":"VybrÃƒÂ¡no","mappingReady":"Objekt pozorovÃƒÂ¡nÃƒÂ­ pro mÃ„â€ºÃ…â„¢enÃƒÂ­ byl urÃ„Âen","mappingPending":"Objekt pozorovÃƒÂ¡nÃƒÂ­ pro mÃ„â€ºÃ…â„¢enÃƒÂ­ zatÃƒÂ­m nebyl urÃ„Âen","confirmTitle":"DokonÃ„Âit sadu parametrÃ…Â¯","confirmHint":"Jakmile je sada kompletnÃƒÂ­, potvrÃ„Âte ji. PotÃƒÂ© zpracujte parametry postupnÃ„â€º a pro kaÃ…Â¾dÃƒÂ½ urÃ„Âete listovÃƒÂ½ objekt pozorovÃƒÂ¡nÃƒÂ­, jehoÃ…Â¾ hodnotu mÃ„â€ºÃ…â„¢ÃƒÂ­.","confirmComment":"KomentÃƒÂ¡Ã…â„¢ k rozhodnutÃƒÂ­","confirmCommentHint":"StruÃ„ÂnÃ„â€º vysvÃ„â€ºtlete, proÃ„Â je tato sada dostaÃ„ÂujÃƒÂ­cÃƒÂ­.","confirmButton":"Potvrdit sadu a pokraÃ„Âovat","confirmed":"Sada parametrÃ…Â¯ typickÃƒÂ© aktivity potvrzena","confirmedHint":"Sada je pro tento krok pevnÃ„â€º nastavena. NynÃƒÂ­ pro kaÃ…Â¾dÃƒÂ½ parametr urÃ„Âete listovÃƒÂ½ objekt pozorovÃƒÂ¡nÃƒÂ­, jehoÃ…Â¾ hodnotu mÃ„â€ºÃ…â„¢ÃƒÂ­.","currentParameter":"NastavovanÃƒÂ½ parametr","allMapped":"Objekty pozorovÃƒÂ¡nÃƒÂ­ urÃ„Âeny pro vÃ…Â¡echna mÃ„â€ºÃ…â„¢enÃƒÂ­","allMappedHint":"Tato Ã„ÂÃƒÂ¡st konstruktoru je dokonÃ„Âena. MÃ…Â¯Ã…Â¾ete pokraÃ„Âovat dalÃ…Â¡ÃƒÂ­ fÃƒÂ¡zÃƒÂ­.","openCatalog":"OtevÃ…â„¢ÃƒÂ­t katalog parametrÃ…Â¯","loading":"NaÃ„ÂÃƒÂ­tÃƒÂ¡nÃƒÂ­ konstruktoru parametrÃ…Â¯Ã¢â‚¬Â¦","saving":"UklÃƒÂ¡dÃƒÂ¡nÃƒÂ­Ã¢â‚¬Â¦","loadError":"Konstruktor parametrÃ…Â¯ se nepodaÃ…â„¢ilo naÃ„ÂÃƒÂ­st nebo uloÃ…Â¾it.","newTitle":"NÃƒÂ¡zev","newDescription":"Popis","technicalCode":"TechnickÃƒÂ½ kÃƒÂ³d","dimension":"RozmÃ„â€ºr","valueType":"Typ hodnoty","unit":"KanonickÃƒÂ¡ jednotka","aggregation":"Agregace","window":"VÃƒÂ½chozÃƒÂ­ okno","allowNegative":"Povolit zÃƒÂ¡pornÃƒÂ© hodnoty","choose":"VyberteÃ¢â‚¬Â¦","createAndAdd":"VytvoÃ…â„¢it systÃƒÂ©movÃƒÂ½ parametr a pÃ…â„¢idat"};

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
    mappedCount: "ÃÂÃÂ°ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾ ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂ²Ã‘â€¹Ã‘â€¦ ÃÂ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€šÃÂ¾ÃÂ² ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â",
    addMore: "+ Ãâ€ÃÂ¾ÃÂ±ÃÂ°ÃÂ²ÃÂ¸Ã‘â€šÃ‘Å’ ÃÂµÃ‘â€°Ã‘â€˜ ÃÅ¾ÃÂ",
    confirmSet: "Ãâ€™Ã‘ÂÃÂµ ÃÅ¾ÃÂ Ã‘ÂÃ‘â€šÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ° ÃÂ½ÃÂ°ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½Ã‘â€¹",
    setConfirmed: "ÃÂÃÂ°ÃÂ±ÃÂ¾Ã‘â‚¬ ÃÂ¾ÃÂ±Ã‘Å ÃÂµÃÂºÃ‘â€šÃÂ¾ÃÂ² ÃÂ½ÃÂ°ÃÂ±ÃÂ»Ã‘Å½ÃÂ´ÃÂµÃÂ½ÃÂ¸Ã‘Â ÃÂ¿ÃÂ¾ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ¶ÃÂ´Ã‘â€˜ÃÂ½",
  },
  pl: {
    mappedCount: "Przypisane liÃ…â€ºciowe obiekty obserwacji",
    addMore: "+ Dodaj kolejny obiekt obserwacji",
    confirmSet: "Wszystkie obiekty obserwacji tego parametru sÃ„â€¦ przypisane",
    setConfirmed: "Zestaw obiektÃƒÂ³w obserwacji potwierdzony",
  },
  uk: {
    mappedCount: "ÃÅ¸Ã‘â‚¬ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾ ÃÂ»ÃÂ¸Ã‘ÂÃ‘â€šÃÂ¾ÃÂ²ÃÂ¸Ã‘â€¦ ÃÂ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€šÃ‘â€“ÃÂ² Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â",
    addMore: "+ Ãâ€ÃÂ¾ÃÂ´ÃÂ°Ã‘â€šÃÂ¸ Ã‘â€°ÃÂµ ÃÂ¾ÃÂ´ÃÂ¸ÃÂ½ ÃÅ¾ÃÂ",
    confirmSet: "ÃÂ£Ã‘ÂÃ‘â€“ ÃÅ¾ÃÂ Ã‘â€ Ã‘Å’ÃÂ¾ÃÂ³ÃÂ¾ ÃÂ¿ÃÂ°Ã‘â‚¬ÃÂ°ÃÂ¼ÃÂµÃ‘â€šÃ‘â‚¬ÃÂ° ÃÂ¿Ã‘â‚¬ÃÂ¸ÃÂ·ÃÂ½ÃÂ°Ã‘â€¡ÃÂµÃÂ½ÃÂ¾",
    setConfirmed: "ÃÂÃÂ°ÃÂ±Ã‘â€“Ã‘â‚¬ ÃÂ¾ÃÂ±Ã¢â‚¬â„¢Ã‘â€ÃÂºÃ‘â€šÃ‘â€“ÃÂ² Ã‘ÂÃÂ¿ÃÂ¾Ã‘ÂÃ‘â€šÃÂµÃ‘â‚¬ÃÂµÃÂ¶ÃÂµÃÂ½ÃÂ½Ã‘Â ÃÂ¿Ã‘â€“ÃÂ´Ã‘â€šÃÂ²ÃÂµÃ‘â‚¬ÃÂ´ÃÂ¶ÃÂµÃÂ½ÃÂ¾",
  },
  de: {
    mappedCount: "Zugeordnete Blatt-Beobachtungsobjekte",
    addMore: "+ Weiteres Beobachtungsobjekt hinzufÃƒÂ¼gen",
    confirmSet: "Alle Beobachtungsobjekte dieses Parameters sind zugeordnet",
    setConfirmed: "Beobachtungsobjekt-Satz bestÃƒÂ¤tigt",
  },
  es: {
    mappedCount: "Objetos de observaciÃƒÂ³n hoja asignados",
    addMore: "+ AÃƒÂ±adir otro objeto de observaciÃƒÂ³n",
    confirmSet: "Todos los objetos de observaciÃƒÂ³n de este parÃƒÂ¡metro estÃƒÂ¡n asignados",
    setConfirmed: "Conjunto de objetos de observaciÃƒÂ³n confirmado",
  },
  cs: {
    mappedCount: "PÃ…â„¢iÃ…â„¢azenÃƒÂ© listovÃƒÂ© objekty pozorovÃƒÂ¡nÃƒÂ­",
    addMore: "+ PÃ…â„¢idat dalÃ…Â¡ÃƒÂ­ objekt pozorovÃƒÂ¡nÃƒÂ­",
    confirmSet: "VÃ…Â¡echny objekty pozorovÃƒÂ¡nÃƒÂ­ tohoto parametru jsou pÃ…â„¢iÃ…â„¢azeny",
    setConfirmed: "Sada objektÃ…Â¯ pozorovÃƒÂ¡nÃƒÂ­ potvrzena",
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
    .join(" Ã‚Â· ");
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
                        Ã¢â‚¬Â¢ {mapping.title || localized(mapping.summaryRu, mapping.summaryEn, locale) || mapping.valueObjectId}
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
