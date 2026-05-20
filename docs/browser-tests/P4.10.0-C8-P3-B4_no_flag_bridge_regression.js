(async () => {
  console.clear();

  const endpoint = "/api/activity/debug/free-text-value-object-test";
  const runId = `C8-P3-B4-${Date.now()}`;

  const payload = {
    inputText: "walked to work for 15 minutes",
    durationMinutes: 15,
    title: `Walked to work — ${runId} no flag`,
    description:
      "P4.10.0-C8-P3-B4 no-flag bridge regression after additionalCategoryLinks loop call",
  };

  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function collectBridgeLikeObjects(value, path = "root", output = []) {
    if (!isObject(value)) {
      return output;
    }

    if (Array.isArray(value.created)) {
      const looksLikeBridge =
        "mappingsRequested" in value ||
        "eventId" in value ||
        value.created.some(
          (item) =>
            isObject(item) &&
            ("valueObjectId" in item ||
              "valueObjectInstanceId" in item ||
              "activityEventValueObjectLinkId" in item)
        );

      if (looksLikeBridge) {
        output.push({ path, value });
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (isObject(child)) {
        collectBridgeLikeObjects(child, `${path}.${key}`, output);
      } else if (Array.isArray(child)) {
        child.forEach((item, index) => {
          if (isObject(item)) {
            collectBridgeLikeObjects(item, `${path}.${key}[${index}]`, output);
          }
        });
      }
    }

    return output;
  }

  function extractCreatedItems(bridgeLikeObjects) {
    return bridgeLikeObjects.flatMap((entry) =>
      Array.isArray(entry.value.created) ? entry.value.created : []
    );
  }

  function getCategoryDerivationObject(data) {
    if (isObject(data?.categoryDerivation)) return data.categoryDerivation;
    if (isObject(data?.debug?.categoryDerivation)) return data.debug.categoryDerivation;
    if (isObject(data?.categoryDerivationResult)) return data.categoryDerivationResult;
    return null;
  }

  console.log("");
  console.log("============================================================");
  console.log("P4.10.0-C8-P3-B4 — no-flag bridge regression");
  console.log("============================================================");
  console.log("Endpoint:", endpoint);
  console.log("Payload:", payload);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let data = null;
  let parseError = null;

  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  console.log("");
  console.log("HTTP status:", response.status);
  console.log("Content-Type:", contentType);

  if (parseError) {
    console.error("JSON parse error:", parseError);
    console.log("Raw response:", rawText);
    return;
  }

  console.log("");
  console.log("Raw response:");
  console.log(JSON.stringify(data, null, 2));

  const bridgeLikeObjects = collectBridgeLikeObjects(data);
  const createdItems = extractCreatedItems(bridgeLikeObjects);
  const categoryDerivation = getCategoryDerivationObject(data);

  const createdItemsWithAdditionalFields = createdItems.filter(
    (item) =>
      isObject(item) &&
      "additionalValueObjectCategoryLinks" in item &&
      "additionalValueObjectCategoryLinkErrors" in item
  );

  const additionalLinksEmpty =
    createdItems.length > 0 &&
    createdItems.every((item) => {
      if (!isObject(item)) return false;

      if (!("additionalValueObjectCategoryLinks" in item)) {
        return false;
      }

      return (
        Array.isArray(item.additionalValueObjectCategoryLinks) &&
        item.additionalValueObjectCategoryLinks.length === 0
      );
    });

  const additionalErrorsEmpty =
    createdItems.length > 0 &&
    createdItems.every((item) => {
      if (!isObject(item)) return false;

      if (!("additionalValueObjectCategoryLinkErrors" in item)) {
        return false;
      }

      return (
        Array.isArray(item.additionalValueObjectCategoryLinkErrors) &&
        item.additionalValueObjectCategoryLinkErrors.length === 0
      );
    });

  const categoryDerivationNotEnabled =
    !categoryDerivation ||
    categoryDerivation.enabled === false ||
    categoryDerivation.skipped === true ||
    categoryDerivation.status === "skipped" ||
    categoryDerivation.reason === "disabled";

  const checks = {
    http200: response.status === 200,
    responseOkTrue: data?.ok === true,
    validJson: data !== null && parseError === null,
    bridgeLikeObjectFound: bridgeLikeObjects.length > 0,
    createdItemsPositive: createdItems.length > 0,
    additionalFieldsVisibleOnCreatedItems:
      createdItemsWithAdditionalFields.length === createdItems.length &&
      createdItems.length > 0,
    additionalLinksEmpty,
    additionalErrorsEmpty,
    categoryDerivationNotEnabled,
  };

  console.log("");
  console.log("============================================================");
  console.log("Bridge-like objects");
  console.log("============================================================");
  console.table(
    bridgeLikeObjects.map((entry) => ({
      path: entry.path,
      createdCount: Array.isArray(entry.value.created)
        ? entry.value.created.length
        : null,
      ok: entry.value.ok,
      skipped: entry.value.skipped,
      mappingsRequested: entry.value.mappingsRequested,
    }))
  );

  console.log("");
  console.log("============================================================");
  console.log("Checks");
  console.log("============================================================");
  console.table(checks);

  console.log("");
  console.log("============================================================");
  console.log("Important values");
  console.log("============================================================");
  console.log({
    runId,
    eventId: data?.eventId ?? data?.activityEvent?.id ?? data?.event?.id ?? null,
    bridgeLikeObjectPaths: bridgeLikeObjects.map((entry) => entry.path),
    createdItemsCount: createdItems.length,
    createdItemsWithAdditionalFieldsCount: createdItemsWithAdditionalFields.length,
    categoryDerivation,
  });

  const failedChecks = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);

  console.log("");
  if (failedChecks.length === 0) {
    console.log("RESULT: PASS — C8-P3-B4 no-flag regression is stable.");
  } else {
    console.warn("RESULT: PARTIAL/FAIL");
    console.warn("Failed checks:", failedChecks);
  }
})();